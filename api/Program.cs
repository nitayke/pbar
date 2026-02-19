using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Data;
using Pbar.Api.Models;
using Pbar.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseOracle(builder.Configuration.GetConnectionString("Default")));

builder.Services.Configure<PartitioningOptions>(builder.Configuration.GetSection("Partitioning"));
builder.Services.Configure<MetricsOptions>(builder.Configuration.GetSection("Metrics"));
builder.Services.Configure<UserAutocompleteOptions>(builder.Configuration.GetSection("Users"));

builder.Services.AddSingleton<TaskMetricsCache>();
builder.Services.AddHostedService<TaskMetricsSampler>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("default");

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/users", (string? query, IOptions<UserAutocompleteOptions> options) =>
{
    var values = options.Value.Values ?? Array.Empty<string>();
    if (string.IsNullOrWhiteSpace(query))
    {
        return Results.Ok(values.Take(20));
    }

    var matches = values
        .Where(value => value.Contains(query, StringComparison.OrdinalIgnoreCase))
        .Take(20)
        .ToArray();

    return Results.Ok(matches);
});

app.MapGet("/api/tasks", async (
    AppDbContext db,
    string? type,
    string? search,
    int? skip,
    int? take,
    bool? includeProgress) =>
{
    var query = db.Tasks.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(search))
    {
        query = query.Where(task => task.TaskId.Contains(search));
    }

    if (!string.IsNullOrWhiteSpace(type))
    {
        var normalized = type.Trim().ToLowerInvariant();
        query = TaskTypeHelper.ApplyTypeFilter(query, normalized);
    }

    var safeSkip = Math.Max(skip ?? 0, 0);
    var safeTake = Math.Clamp(take ?? 100, 1, 500);

    var tasks = await query
        .OrderByDescending(task => task.LastUpdate)
        .Skip(safeSkip)
        .Take(safeTake)
        .Select(task => new TaskSummaryDto
        {
            TaskId = task.TaskId,
            Description = task.Description,
            LastUpdate = task.LastUpdate,
            CreatedBy = task.CreatedBy,
            PartitionSizeSeconds = task.PartitionSizeSeconds,
            Type = TaskTypeHelper.GetType(task.TaskId)
        })
        .ToListAsync();

    if (includeProgress == true && tasks.Count > 0)
    {
        var ids = tasks.Select(t => t.TaskId).ToArray();
        var counts = await db.TaskPartitions
            .AsNoTracking()
            .Where(p => ids.Contains(p.TaskId))
            .GroupBy(p => new { p.TaskId, p.Status })
            .Select(g => new { g.Key.TaskId, g.Key.Status, Count = g.Count() })
            .ToListAsync();

        var progressMap = TaskStatusHelper.BuildProgressMap(counts);

        foreach (var task in tasks)
        {
            if (progressMap.TryGetValue(task.TaskId, out var progress))
            {
                task.Progress = progress;
            }
        }
    }

    return Results.Ok(tasks);
});

app.MapGet("/api/tasks/{taskId}", async (string taskId, AppDbContext db) =>
{
    var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.TaskId == taskId);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapGet("/api/tasks/{taskId}/ranges", async (string taskId, AppDbContext db) =>
{
    var ranges = await db.TaskTimeRanges
        .AsNoTracking()
        .Where(range => range.TaskId == taskId)
        .OrderBy(range => range.TimeFrom)
        .ToListAsync();

    return Results.Ok(ranges.Select(r => new TaskRangeDto
    {
        TimeFrom = r.TimeFrom,
        TimeTo = r.TimeTo
    }));
});

app.MapGet("/api/tasks/{taskId}/progress", async (string taskId, AppDbContext db) =>
{
    var counts = await db.TaskPartitions
        .AsNoTracking()
        .Where(p => p.TaskId == taskId)
        .GroupBy(p => p.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() })
        .ToListAsync();

    var progress = TaskStatusHelper.BuildProgress(counts);
    return Results.Ok(progress);
});

app.MapGet("/api/tasks/{taskId}/metrics", (string taskId, TaskMetricsCache cache) =>
{
    return Results.Ok(cache.Get(taskId));
});

app.MapGet("/api/tasks/{taskId}/status-histogram", async (
    string taskId,
    int? intervalSeconds,
    DateTime? from,
    DateTime? to,
    AppDbContext db) =>
{
    var task = await db.Tasks
        .AsNoTracking()
        .Where(t => t.TaskId == taskId)
        .Select(t => new { t.TaskId, t.PartitionSizeSeconds })
        .FirstOrDefaultAsync();

    if (task is null)
    {
        return Results.NotFound();
    }

    var effectiveInterval = Math.Clamp(intervalSeconds ?? task.PartitionSizeSeconds ?? 300, 1, 86400);

    var query = db.TaskPartitions
        .AsNoTracking()
        .Where(p => p.TaskId == taskId);

    if (from.HasValue)
    {
        query = query.Where(p => p.TimeFrom >= from.Value);
    }

    if (to.HasValue)
    {
        query = query.Where(p => p.TimeFrom < to.Value);
    }

    var rows = await query
        .Select(p => new { p.TimeFrom, p.Status })
        .ToListAsync();

    var buckets = new Dictionary<DateTime, Dictionary<string, long>>();

    foreach (var row in rows)
    {
        var utc = row.TimeFrom.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(row.TimeFrom, DateTimeKind.Utc)
            : row.TimeFrom.ToUniversalTime();

        var epoch = new DateTimeOffset(utc).ToUnixTimeSeconds();
        var bucketEpoch = (epoch / effectiveInterval) * effectiveInterval;
        var bucketTime = DateTimeOffset.FromUnixTimeSeconds(bucketEpoch).UtcDateTime;

        var status = string.IsNullOrWhiteSpace(row.Status)
            ? "unknown"
            : row.Status.Trim().ToLowerInvariant();

        if (!buckets.TryGetValue(bucketTime, out var statusMap))
        {
            statusMap = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            buckets[bucketTime] = statusMap;
        }

        statusMap.TryGetValue(status, out var current);
        statusMap[status] = current + 1;
    }

    var dto = new TaskStatusHistogramDto
    {
        IntervalSeconds = effectiveInterval,
        Buckets = buckets
            .OrderBy(entry => entry.Key)
            .Select(entry => new TaskStatusHistogramBucketDto
            {
                TimestampUtc = entry.Key,
                Statuses = entry.Value
                    .OrderBy(pair => pair.Key)
                    .Select(pair => new TaskStatusCountDto
                    {
                        Status = pair.Key,
                        Count = pair.Value
                    })
                    .ToList()
            })
            .ToList()
    };

    return Results.Ok(dto);
});

app.MapGet("/api/tasks/{taskId}/partitions", async (
    string taskId,
    int? skip,
    int? take,
    AppDbContext db) =>
{
    var safeSkip = Math.Max(skip ?? 0, 0);
    var safeTake = Math.Clamp(take ?? 100, 1, 500);

    var partitions = await db.TaskPartitions
        .AsNoTracking()
        .Where(p => p.TaskId == taskId)
        .OrderBy(p => p.TimeFrom)
        .Skip(safeSkip)
        .Take(safeTake)
        .ToListAsync();

    return Results.Ok(partitions);
});

app.MapPost("/api/tasks", async (
    TaskCreateRequest request,
    AppDbContext db,
    IOptions<PartitioningOptions> partitionOptions) =>
{
    if (string.IsNullOrWhiteSpace(request.TaskId))
    {
        return Results.BadRequest("TaskId is required.");
    }

    var exists = await db.Tasks.AnyAsync(t => t.TaskId == request.TaskId);
    if (exists)
    {
        return Results.Conflict("Task already exists.");
    }

    if (request.Ranges is null || request.Ranges.Count == 0)
    {
        return Results.BadRequest("At least one time range is required.");
    }

    var now = DateTime.UtcNow;
    var task = new TaskEntity
    {
        TaskId = request.TaskId,
        Description = request.Description ?? string.Empty,
        CreatedBy = request.CreatedBy ?? string.Empty,
        LastUpdate = now
    };

    var rangeEntities = new List<TaskTimeRange>();
    foreach (var range in request.Ranges)
    {
        if (range.TimeTo <= range.TimeFrom)
        {
            return Results.BadRequest("TimeTo must be after TimeFrom.");
        }

        rangeEntities.Add(new TaskTimeRange
        {
            TaskId = request.TaskId,
            TimeFrom = range.TimeFrom,
            TimeTo = range.TimeTo
        });
    }

    var options = partitionOptions.Value;
    var partitionSizeSeconds = request.PartitionSizeSeconds
        ?? (request.PartitionMinutes.HasValue ? request.PartitionMinutes.Value * 60 : (int?)null)
        ?? options.PartitionMinutes * 60;

    if (partitionSizeSeconds <= 0)
    {
        return Results.BadRequest("PartitionSizeSeconds must be greater than zero.");
    }

    task.PartitionSizeSeconds = partitionSizeSeconds;

    var todoStatus = string.IsNullOrWhiteSpace(options.PartitionStatusTodo)
        ? "TODO"
        : options.PartitionStatusTodo.Trim();

    await using var tx = await db.Database.BeginTransactionAsync();

    db.Tasks.Add(task);
    db.TaskTimeRanges.AddRange(rangeEntities);
    await db.SaveChangesAsync();

    foreach (var range in rangeEntities)
    {
        var cursor = range.TimeFrom;
        var batch = new List<TaskPartition>(2000);

        while (cursor < range.TimeTo)
        {
            var next = cursor.AddSeconds(partitionSizeSeconds);
            if (next > range.TimeTo)
            {
                next = range.TimeTo;
            }

            batch.Add(new TaskPartition
            {
                TaskId = request.TaskId,
                TimeFrom = cursor,
                TimeTo = next,
                Status = todoStatus
            });

            if (batch.Count >= 2000)
            {
                db.TaskPartitions.AddRange(batch);
                await db.SaveChangesAsync();
                batch.Clear();
            }

            cursor = next;
        }

        if (batch.Count > 0)
        {
            db.TaskPartitions.AddRange(batch);
            await db.SaveChangesAsync();
        }
    }

    await tx.CommitAsync();

    return Results.Created($"/api/tasks/{request.TaskId}", new { request.TaskId });
});

app.MapDelete("/api/tasks/{taskId}", async (string taskId, AppDbContext db) =>
{
    var exists = await db.Tasks.AnyAsync(t => t.TaskId == taskId);
    if (!exists)
    {
        return Results.NotFound();
    }

    await using var tx = await db.Database.BeginTransactionAsync();

    await db.TaskPartitions.Where(p => p.TaskId == taskId).ExecuteDeleteAsync();
    await db.TaskTimeRanges.Where(r => r.TaskId == taskId).ExecuteDeleteAsync();
    await db.Tasks.Where(t => t.TaskId == taskId).ExecuteDeleteAsync();

    await tx.CommitAsync();
    return Results.NoContent();
});

app.MapDelete("/api/tasks/{taskId}/partitions", async (string taskId, AppDbContext db) =>
{
    await db.TaskPartitions.Where(p => p.TaskId == taskId).ExecuteDeleteAsync();
    return Results.NoContent();
});

app.MapDelete("/api/tasks/{taskId}/ranges", async (
    string taskId,
    DateTime from,
    DateTime to,
    string? delete,
    AppDbContext db) =>
{
    var mode = (delete ?? "all").Trim().ToLowerInvariant();

    if (mode == "partitions" || mode == "all")
    {
        await db.TaskPartitions
            .Where(p => p.TaskId == taskId && p.TimeFrom >= from && p.TimeTo <= to)
            .ExecuteDeleteAsync();
    }

    if (mode == "range" || mode == "all")
    {
        await db.TaskTimeRanges
            .Where(r => r.TaskId == taskId && r.TimeFrom == from && r.TimeTo == to)
            .ExecuteDeleteAsync();
    }

    return Results.NoContent();
});

app.Run();

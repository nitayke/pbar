using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Data;

namespace Pbar.Api.Services;

public sealed class TaskMetricsSampler : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly TaskMetricsCache _cache;
    private readonly IOptions<MetricsOptions> _options;

    public TaskMetricsSampler(IServiceProvider services, TaskMetricsCache cache, IOptions<MetricsOptions> options)
    {
        _services = services;
        _cache = cache;
        _options = options;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await SampleAsync(stoppingToken);
            var delay = TimeSpan.FromSeconds(Math.Max(2, _options.Value.SampleIntervalSeconds));
            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task SampleAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var lookback = DateTime.UtcNow.AddMinutes(-_options.Value.LookbackMinutes);
        var taskIds = await db.Tasks.AsNoTracking()
            .Where(t => t.LastUpdate >= lookback)
            .OrderByDescending(t => t.LastUpdate)
            .Take(_options.Value.MaxTasks)
            .Select(t => t.TaskId)
            .ToListAsync(stoppingToken);

        if (taskIds.Count == 0)
        {
            return;
        }

        var counts = await db.TaskPartitions.AsNoTracking()
            .Where(p => taskIds.Contains(p.TaskId))
            .GroupBy(p => new { p.TaskId, p.Status })
            .Select(g => new { g.Key.TaskId, g.Key.Status, Count = g.Count() })
            .ToListAsync(stoppingToken);

        var progressMap = TaskStatusHelper.BuildProgressMap(counts);
        var timestamp = DateTime.UtcNow;

        foreach (var taskId in taskIds)
        {
            if (!progressMap.TryGetValue(taskId, out var progress))
            {
                continue;
            }

            var sample = new TaskMetricSampleDto
            {
                TimestampUtc = timestamp,
                Done = progress.Done,
                Total = progress.Total
            };

            _cache.AddSample(taskId, sample, maxSamples: 360);
        }
    }
}

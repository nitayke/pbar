using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Data;
using Pbar.Api.Repositories;

namespace Pbar.Api.Services;

public sealed class TaskMetricsSampler : BackgroundService
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;
    private readonly TaskMetricsCache _cache;
    private readonly IOptions<MetricsOptions> _options;

    public TaskMetricsSampler(
        IDbContextFactory<AppDbContext> contextFactory,
        TaskMetricsCache cache,
        IOptions<MetricsOptions> options)
    {
        _contextFactory = contextFactory;
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
        using var db = await _contextFactory.CreateDbContextAsync(stoppingToken);

        var lookback = DateTime.UtcNow.AddMinutes(-_options.Value.LookbackMinutes);
        var taskIds = await db.Tasks.AsNoTracking()
            .Where(t => t.LastUpdate >= lookback)
            .OrderByDescending(t => t.LastUpdate)
            .Take(_options.Value.MaxTasks)
            .Select(t => t.TaskId)
            .ToListAsync(stoppingToken);

        if (taskIds.Count == 0) return;

        var partitionRepo = new PartitionRepository(db);
        var countsMap = await partitionRepo.GetStatusCountsForTasksAsync(taskIds);
        var progressMap = TaskStatusHelper.BuildProgressMap(countsMap);
        var timestamp = DateTime.UtcNow;

        foreach (var taskId in taskIds)
        {
            if (!progressMap.TryGetValue(taskId, out var progress)) continue;

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

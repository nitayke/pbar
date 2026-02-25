using Pbar.Api.Contracts;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class HistogramService : IHistogramService
{
    private readonly IUnitOfWork _uow;

    public HistogramService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<TaskStatusHistogramDto?> GetHistogramAsync(
        string taskId, int? intervalSeconds, DateTime? from, DateTime? to)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId);
        if (task is null) return null;

        var rows = await _uow.Partitions.GetHistogramRowsAsync(taskId, from, to);

        var effectiveInterval = CalculateInterval(intervalSeconds, from, to, task.PartitionSizeSeconds, rows);

        var buckets = new Dictionary<DateTime, Dictionary<string, long>>();

        foreach (var row in rows)
        {
            var utc = row.TimeFrom.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(row.TimeFrom, DateTimeKind.Utc)
                : row.TimeFrom.ToUniversalTime();

            var epoch = new DateTimeOffset(utc).ToUnixTimeSeconds();
            var bucketEpoch = epoch / effectiveInterval * effectiveInterval;
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

        return new TaskStatusHistogramDto
        {
            IntervalSeconds = effectiveInterval,
            Buckets = buckets
                .OrderBy(e => e.Key)
                .Select(e => new TaskStatusHistogramBucketDto
                {
                    TimestampUtc = e.Key,
                    Statuses = e.Value
                        .OrderBy(p => p.Key)
                        .Select(p => new TaskStatusCountDto
                        {
                            Status = p.Key,
                            Count = p.Value
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    private static int CalculateInterval(
        int? intervalSeconds, DateTime? from, DateTime? to,
        int? partitionSizeSeconds, List<PartitionRow> rows)
    {
        if (intervalSeconds.HasValue)
            return Math.Clamp(intervalSeconds.Value, 1, 86400);

        // Determine the effective time span from explicit bounds or from the data itself
        DateTime? spanFrom = from;
        DateTime? spanTo = to;
        if ((!spanFrom.HasValue || !spanTo.HasValue) && rows.Count > 0)
        {
            spanFrom ??= rows.Min(r => r.TimeFrom);
            spanTo ??= rows.Max(r => r.TimeFrom);
        }

        if (spanFrom.HasValue && spanTo.HasValue)
        {
            var span = spanTo.Value - spanFrom.Value;
            if (span.TotalHours <= 6) return 300;          // 5 min buckets
            if (span.TotalDays <= 1) return 900;            // 15 min buckets
            if (span.TotalDays <= 3) return 1800;           // 30 min buckets
            if (span.TotalDays <= 7) return 3600;           // 1 hour buckets
            if (span.TotalDays <= 30) return 14400;         // 4 hour buckets
            if (span.TotalDays <= 90) return 43200;         // 12 hour buckets
            return 86400;                                   // 1 day buckets
        }

        return partitionSizeSeconds ?? 3600;
    }
}

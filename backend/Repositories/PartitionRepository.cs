using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;
using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public sealed class PartitionRepository : IPartitionRepository
{
    private readonly AppDbContext _db;

    public PartitionRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TaskPartition>> GetByTaskIdAsync(string taskId, int skip, int take)
    {
        return await _db.TaskPartitions
            .AsNoTracking()
            .Where(p => p.TaskId == taskId)
            .OrderBy(p => p.TimeFrom)
            .Skip(Math.Max(skip, 0))
            .Take(Math.Clamp(take, 1, 500))
            .ToListAsync();
    }

    public async Task<TaskPartition?> ClaimNextAsync(string taskId, string todoStatus, string inProgressStatus)
    {
        const int maxAttempts = 20;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            var candidate = await _db.TaskPartitions
                .AsNoTracking()
                .Where(p => p.TaskId == taskId && p.Status == todoStatus)
                .OrderBy(p => p.TimeFrom)
                .ThenBy(p => p.TimeTo)
                .Select(p => new { p.RangeId, p.TaskId, p.TimeFrom, p.TimeTo })
                .FirstOrDefaultAsync();

            if (candidate is null)
            {
                return null;
            }

            var updatedRows = await _db.TaskPartitions
                .Where(p => p.TaskId == candidate.TaskId
                            && p.TimeFrom == candidate.TimeFrom
                            && p.TimeTo == candidate.TimeTo
                            && p.Status == todoStatus)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(p => p.Status, inProgressStatus));

            if (updatedRows == 1)
            {
                return new TaskPartition
                {
                    RangeId = candidate.RangeId,
                    TaskId = candidate.TaskId,
                    TimeFrom = candidate.TimeFrom,
                    TimeTo = candidate.TimeTo,
                    Status = inProgressStatus
                };
            }
        }

        return null;
    }

    public async Task<List<StatusCount>> GetStatusCountsAsync(string taskId)
    {
        return await _db.TaskPartitions
            .AsNoTracking()
            .Where(p => p.TaskId == taskId)
            .GroupBy(p => p.Status)
            .Select(g => new StatusCount
            {
                TaskId = taskId,
                Status = g.Key,
                Count = g.Count()
            })
            .ToListAsync();
    }

    public async Task<Dictionary<string, List<StatusCount>>> GetStatusCountsForTasksAsync(IEnumerable<string> taskIds)
    {
        var ids = taskIds.ToArray();
        var counts = await _db.TaskPartitions
            .AsNoTracking()
            .Where(p => ids.Contains(p.TaskId))
            .GroupBy(p => new { p.TaskId, p.Status })
            .Select(g => new StatusCount
            {
                TaskId = g.Key.TaskId,
                Status = g.Key.Status,
                Count = g.Count()
            })
            .ToListAsync();

        return counts
            .GroupBy(c => c.TaskId)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    public async Task<List<PartitionRow>> GetHistogramRowsAsync(string taskId, DateTime? from, DateTime? to)
    {
        var query = _db.TaskPartitions
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

        return await query
            .Select(p => new PartitionRow
            {
                TimeFrom = p.TimeFrom,
                Status = p.Status
            })
            .ToListAsync();
    }

    public async Task CreateBatchAsync(IEnumerable<TaskPartition> partitions)
    {
        var items = partitions as IList<TaskPartition> ?? partitions.ToList();
        if (items.Count == 0) return;

        // Use raw SQL for Oracle bulk insert – much faster than EF change tracking
        // INSERT ALL INTO ... SELECT FROM DUAL
        const int maxRowsPerStatement = 500; // Oracle limit ~1000 binds; keep safe
        var offset = 0;
        while (offset < items.Count)
        {
            var chunk = items.Skip(offset).Take(maxRowsPerStatement).ToList();
            var sql = new System.Text.StringBuilder();
            sql.Append("INSERT ALL ");

            var parameters = new List<object>();
            for (var i = 0; i < chunk.Count; i++)
            {
                var p = chunk[i];
                sql.Append($"INTO \"TASK_PARTITIONS\" (\"RANGE_ID\",\"TASK_ID\",\"TIME_FROM\",\"TIME_TO\",\"STATUS\") VALUES ({{" +
                    $"{i * 5}}},{{{i * 5 + 1}}},{{{i * 5 + 2}}},{{{i * 5 + 3}}},{{{i * 5 + 4}}}) ");
                parameters.Add(p.RangeId);
                parameters.Add(p.TaskId);
                parameters.Add(p.TimeFrom);
                parameters.Add(p.TimeTo);
                parameters.Add(p.Status);
            }
            sql.Append("SELECT 1 FROM DUAL");

            await _db.Database.ExecuteSqlRawAsync(sql.ToString(), parameters.ToArray());
            offset += maxRowsPerStatement;
        }
    }

    public async Task DeleteByTaskIdAsync(string taskId)
    {
        await _db.TaskPartitions.Where(p => p.TaskId == taskId).ExecuteDeleteAsync();
    }

    public async Task DeleteByRangeIdAsync(string taskId, string rangeId)
    {
        await _db.TaskPartitions
            .Where(p => p.TaskId == taskId && p.RangeId == rangeId)
            .ExecuteDeleteAsync();
    }
}

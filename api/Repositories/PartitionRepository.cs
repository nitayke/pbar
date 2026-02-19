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
        _db.TaskPartitions.AddRange(partitions);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteByTaskIdAsync(string taskId)
    {
        await _db.TaskPartitions.Where(p => p.TaskId == taskId).ExecuteDeleteAsync();
    }

    public async Task DeleteByRangeAsync(string taskId, DateTime from, DateTime to)
    {
        await _db.TaskPartitions
            .Where(p => p.TaskId == taskId && p.TimeFrom >= from && p.TimeTo <= to)
            .ExecuteDeleteAsync();
    }
}

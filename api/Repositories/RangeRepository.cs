using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;
using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public sealed class RangeRepository : IRangeRepository
{
    private readonly AppDbContext _db;

    public RangeRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TaskTimeRange>> GetByTaskIdAsync(string taskId)
    {
        return await _db.TaskTimeRanges
            .AsNoTracking()
            .Where(r => r.TaskId == taskId)
            .OrderBy(r => r.TimeFrom)
            .ToListAsync();
    }

    public async Task CreateAsync(TaskTimeRange range)
    {
        _db.TaskTimeRanges.Add(range);
        await _db.SaveChangesAsync();
    }

    public async Task CreateBatchAsync(IEnumerable<TaskTimeRange> ranges)
    {
        _db.TaskTimeRanges.AddRange(ranges);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(string taskId, DateTime from, DateTime to)
    {
        await _db.TaskTimeRanges
            .Where(r => r.TaskId == taskId && r.TimeFrom == from && r.TimeTo == to)
            .ExecuteDeleteAsync();
    }

    public async Task DeleteByTaskIdAsync(string taskId)
    {
        await _db.TaskTimeRanges.Where(r => r.TaskId == taskId).ExecuteDeleteAsync();
    }
}

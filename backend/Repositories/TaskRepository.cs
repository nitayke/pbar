using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;
using Pbar.Api.Models;
using Pbar.Api.Services;

namespace Pbar.Api.Repositories;

public sealed class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _db;

    public TaskRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TaskEntity>> GetAllAsync(string? type, string? search, string? createdBy, int skip, int take)
    {
        var query = _db.Tasks.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => t.TaskId.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalized = type.Trim().ToLowerInvariant();
            query = TaskTypeHelper.ApplyTypeFilter(query, normalized);
        }

        if (!string.IsNullOrWhiteSpace(createdBy))
        {
            var owner = createdBy.Trim();
            query = query.Where(t => _db.TaskTimeRanges.Any(r => r.TaskId == t.TaskId && r.CreatedBy == owner));
        }

        return await query
            .OrderByDescending(t =>
                _db.TaskTimeRanges
                    .Where(r => r.TaskId == t.TaskId)
                    .Max(r => (DateTime?)r.CreationTime))
            .ThenByDescending(t => t.LastUpdate)
            .Skip(Math.Max(skip, 0))
            .Take(Math.Clamp(take, 1, 500))
            .ToListAsync();
    }

    public async Task<TaskEntity?> GetByIdAsync(string taskId)
    {
        return await _db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.TaskId == taskId);
    }

    public async Task<bool> ExistsAsync(string taskId)
    {
        return await _db.Tasks.AnyAsync(t => t.TaskId == taskId);
    }

    public async Task CreateAsync(TaskEntity task)
    {
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(string taskId)
    {
        await _db.Tasks.Where(t => t.TaskId == taskId).ExecuteDeleteAsync();
    }
}

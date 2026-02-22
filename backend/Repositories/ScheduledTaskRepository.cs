using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;
using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public sealed class ScheduledTaskRepository : IScheduledTaskRepository
{
    private readonly AppDbContext _db;

    public ScheduledTaskRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ScheduledTask>> GetAllAsync()
    {
        return await _db.ScheduledTasks
            .AsNoTracking()
            .OrderBy(s => s.TaskId)
            .ThenBy(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<ScheduledTask>> GetByTaskIdAsync(string taskId)
    {
        return await _db.ScheduledTasks
            .AsNoTracking()
            .Where(s => s.TaskId == taskId)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<ScheduledTask?> GetByIdAsync(string scheduleId)
    {
        return await _db.ScheduledTasks
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ScheduleId == scheduleId);
    }

    public async Task<List<ScheduledTask>> GetDueTasksAsync(DateTime asOf)
    {
        return await _db.ScheduledTasks
            .AsNoTracking()
            .Where(s => s.IsEnabled && s.NextExecutionTime != null && s.NextExecutionTime <= asOf)
            .OrderBy(s => s.NextExecutionTime)
            .ToListAsync();
    }

    public async Task CreateAsync(ScheduledTask scheduledTask)
    {
        _db.ScheduledTasks.Add(scheduledTask);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(ScheduledTask scheduledTask)
    {
        await _db.ScheduledTasks
            .Where(s => s.ScheduleId == scheduledTask.ScheduleId)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(s => s.IntervalSeconds, scheduledTask.IntervalSeconds)
                .SetProperty(s => s.BulkSizeSeconds, scheduledTask.BulkSizeSeconds)
                .SetProperty(s => s.IsEnabled, scheduledTask.IsEnabled)
                .SetProperty(s => s.LastExecutionTime, scheduledTask.LastExecutionTime)
                .SetProperty(s => s.NextExecutionTime, scheduledTask.NextExecutionTime));
    }

    public async Task DeleteAsync(string scheduleId)
    {
        await _db.ScheduledTasks
            .Where(s => s.ScheduleId == scheduleId)
            .ExecuteDeleteAsync();
    }

    public async Task DeleteByTaskIdAsync(string taskId)
    {
        await _db.ScheduledTasks
            .Where(s => s.TaskId == taskId)
            .ExecuteDeleteAsync();
    }
}

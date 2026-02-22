using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public interface IScheduledTaskRepository
{
    Task<List<ScheduledTask>> GetAllAsync();
    Task<List<ScheduledTask>> GetByTaskIdAsync(string taskId);
    Task<ScheduledTask?> GetByIdAsync(string scheduleId);
    Task<List<ScheduledTask>> GetDueTasksAsync(DateTime asOf);
    Task CreateAsync(ScheduledTask scheduledTask);
    Task UpdateAsync(ScheduledTask scheduledTask);
    Task DeleteAsync(string scheduleId);
    Task DeleteByTaskIdAsync(string taskId);
}

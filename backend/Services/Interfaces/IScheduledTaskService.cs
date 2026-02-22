using Pbar.Api.Contracts;

namespace Pbar.Api.Services.Interfaces;

public interface IScheduledTaskService
{
    Task<List<ScheduledTaskDto>> GetAllAsync();
    Task<List<ScheduledTaskDto>> GetByTaskIdAsync(string taskId);
    Task<ScheduledTaskDto?> GetByIdAsync(string scheduleId);
    Task<ScheduledTaskDto> CreateAsync(ScheduledTaskCreateRequest request);
    Task<ScheduledTaskDto?> UpdateAsync(string scheduleId, ScheduledTaskUpdateRequest request);
    Task<bool> DeleteAsync(string scheduleId);
    Task ExecuteDueTasksAsync();
}

using Pbar.Api.Contracts;

namespace Pbar.Api.Services.Interfaces;

public interface ITaskService
{
    Task<List<TaskSummaryDto>> GetTasksAsync(string? type, string? search, string? createdBy, int? skip, int? take, bool includeProgress);
    Task<TaskSummaryDto?> GetTaskByIdAsync(string taskId);
    Task<string> CreateTaskAsync(TaskCreateRequest request);
    Task<bool> DeleteTaskAsync(string taskId);
}

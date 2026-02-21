using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public interface ITaskRepository
{
    Task<List<TaskEntity>> GetAllAsync(string? type, string? search, string? createdBy, int skip, int take);
    Task<TaskEntity?> GetByIdAsync(string taskId);
    Task<bool> ExistsAsync(string taskId);
    Task CreateAsync(TaskEntity task);
    Task DeleteAsync(string taskId);
}

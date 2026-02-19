using Pbar.Api.Contracts;

namespace Pbar.Api.Services.Interfaces;

public interface IRangeService
{
    Task<List<TaskRangeDto>> GetRangesAsync(string taskId);
    Task<(bool Success, string? Error)> AddRangeAsync(string taskId, TaskRangeDto range);
    Task DeleteRangeAsync(string taskId, DateTime from, DateTime to, string mode);
}

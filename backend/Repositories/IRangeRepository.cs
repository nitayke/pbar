using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public interface IRangeRepository
{
    Task<List<TaskTimeRange>> GetByTaskIdAsync(string taskId);
    Task<Dictionary<string, List<TaskTimeRange>>> GetByTaskIdsAsync(IEnumerable<string> taskIds);
    Task<TaskTimeRange?> GetByIdentityAsync(string taskId, DateTime from, DateTime to);
    Task CreateAsync(TaskTimeRange range);
    Task CreateBatchAsync(IEnumerable<TaskTimeRange> ranges);
    Task DeleteAsync(string taskId, DateTime from, DateTime to);
    Task DeleteByRangeIdAsync(string rangeId);
    Task DeleteByTaskIdAsync(string taskId);
}

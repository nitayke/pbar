using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public interface IRangeRepository
{
    Task<List<TaskTimeRange>> GetByTaskIdAsync(string taskId);
    Task CreateAsync(TaskTimeRange range);
    Task CreateBatchAsync(IEnumerable<TaskTimeRange> ranges);
    Task DeleteAsync(string taskId, DateTime from, DateTime to);
    Task DeleteByTaskIdAsync(string taskId);
}

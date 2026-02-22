using Pbar.Api.Models;

namespace Pbar.Api.Repositories;

public interface IPartitionRepository
{
    Task<List<TaskPartition>> GetByTaskIdAsync(string taskId, int skip, int take);
    Task<TaskPartition?> ClaimNextAsync(string taskId, string todoStatus, string inProgressStatus);
    Task<List<StatusCount>> GetStatusCountsAsync(string taskId);
    Task<Dictionary<string, List<StatusCount>>> GetStatusCountsForTasksAsync(IEnumerable<string> taskIds);
    Task<List<PartitionRow>> GetHistogramRowsAsync(string taskId, DateTime? from, DateTime? to);
    Task CreateBatchAsync(IEnumerable<TaskPartition> partitions);
    Task DeleteByTaskIdAsync(string taskId);
    Task DeleteByRangeIdAsync(string taskId, string rangeId);
}

public sealed class StatusCount
{
    public string TaskId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public long Count { get; set; }
}

public sealed class PartitionRow
{
    public DateTime TimeFrom { get; set; }
    public string Status { get; set; } = string.Empty;
}

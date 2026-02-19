namespace Pbar.Api.Contracts;

public sealed class TaskSummaryDto
{
    public string TaskId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime LastUpdate { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public int? PartitionSizeSeconds { get; set; }
    public string Type { get; set; } = "other";
    public TaskProgressDto? Progress { get; set; }
}

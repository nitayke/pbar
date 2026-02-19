namespace Pbar.Api.Contracts;

public sealed class TaskCreateRequest
{
    public string TaskId { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CreatedBy { get; set; }
    public List<TaskRangeDto> Ranges { get; set; } = new();
    public int? PartitionMinutes { get; set; }
    public int? PartitionSizeSeconds { get; set; }
}

namespace Pbar.Api.Contracts;

public sealed class ScheduledTaskDto
{
    public string ScheduleId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public int IntervalSeconds { get; set; }
    public int BulkSizeSeconds { get; set; }
    public DateTime? LastExecutionTime { get; set; }
    public DateTime? NextExecutionTime { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

public sealed class ScheduledTaskCreateRequest
{
    public string TaskId { get; set; } = string.Empty;
    public int IntervalSeconds { get; set; }
    public int BulkSizeSeconds { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

public sealed class ScheduledTaskUpdateRequest
{
    public int? IntervalSeconds { get; set; }
    public int? BulkSizeSeconds { get; set; }
    public bool? IsEnabled { get; set; }
}

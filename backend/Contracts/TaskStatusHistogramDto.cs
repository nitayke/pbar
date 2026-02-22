namespace Pbar.Api.Contracts;

public sealed class TaskStatusHistogramDto
{
    public int IntervalSeconds { get; set; }
    public List<TaskStatusHistogramBucketDto> Buckets { get; set; } = new();
}

public sealed class TaskStatusHistogramBucketDto
{
    public DateTime TimestampUtc { get; set; }
    public List<TaskStatusCountDto> Statuses { get; set; } = new();
}

public sealed class TaskStatusCountDto
{
    public string Status { get; set; } = "unknown";
    public long Count { get; set; }
}

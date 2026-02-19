namespace Pbar.Api.Contracts;

public sealed class TaskMetricsDto
{
    public TaskProgressDto Progress { get; set; } = new();
    public double? PartitionsPerMinute { get; set; }
    public double? EstimatedMinutesRemaining { get; set; }
    public DateTime? EstimatedFinishUtc { get; set; }
    public List<TaskMetricSampleDto> Samples { get; set; } = new();
}

public sealed class TaskMetricSampleDto
{
    public DateTime TimestampUtc { get; set; }
    public long Done { get; set; }
    public long Total { get; set; }
}

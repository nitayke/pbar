namespace Pbar.Api.Models;

public sealed class TaskTimeRange
{
    public string RangeId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public DateTime CreationTime { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

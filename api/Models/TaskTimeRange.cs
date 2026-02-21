namespace Pbar.Api.Models;

public sealed class TaskTimeRange
{
    public string TaskId { get; set; } = string.Empty;
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public DateTime CreationTime { get; set; }
}

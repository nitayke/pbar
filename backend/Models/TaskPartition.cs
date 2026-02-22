namespace Pbar.Api.Models;

public sealed class TaskPartition
{
    public string RangeId { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public string Status { get; set; } = string.Empty;
}

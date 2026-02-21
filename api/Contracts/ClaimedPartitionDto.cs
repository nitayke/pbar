namespace Pbar.Api.Contracts;

public sealed class ClaimedPartitionDto
{
    public string TaskId { get; set; } = string.Empty;
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public string Status { get; set; } = string.Empty;
}

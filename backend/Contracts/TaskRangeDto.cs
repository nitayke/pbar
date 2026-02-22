namespace Pbar.Api.Contracts;

public sealed class TaskRangeDto
{
    public string? RangeId { get; set; }
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public DateTime? CreationTime { get; set; }
    public string? CreatedBy { get; set; }
}

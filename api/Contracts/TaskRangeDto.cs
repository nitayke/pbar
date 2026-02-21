namespace Pbar.Api.Contracts;

public sealed class TaskRangeDto
{
    public DateTime TimeFrom { get; set; }
    public DateTime TimeTo { get; set; }
    public DateTime? CreationTime { get; set; }
}

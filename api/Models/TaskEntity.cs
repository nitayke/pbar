namespace Pbar.Api.Models;

public sealed class TaskEntity
{
    public string TaskId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime LastUpdate { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

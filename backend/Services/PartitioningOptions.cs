namespace Pbar.Api.Services;

public sealed class PartitioningOptions
{
    public int PartitionMinutes { get; set; } = 5;
    public string PartitionStatusTodo { get; set; } = "TODO";
}

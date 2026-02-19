namespace Pbar.Api.Contracts;

public sealed class TaskProgressDto
{
    public long Total { get; set; }
    public long Done { get; set; }
    public long InProgress { get; set; }
    public long Todo { get; set; }
    public double PercentDone { get; set; }
    public double PercentInProgress { get; set; }
    public double PercentTodo { get; set; }
}

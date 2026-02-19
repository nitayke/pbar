namespace Pbar.Api.Services;

public sealed class MetricsOptions
{
    public int SampleIntervalSeconds { get; set; } = 10;
    public int LookbackMinutes { get; set; } = 120;
    public int MaxTasks { get; set; } = 200;
}

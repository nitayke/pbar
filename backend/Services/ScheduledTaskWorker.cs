using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class ScheduledTaskWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScheduledTaskWorker> _logger;
    private readonly TimeSpan _pollInterval;

    public ScheduledTaskWorker(
        IServiceProvider serviceProvider,
        ILogger<ScheduledTaskWorker> logger,
        IOptions<ScheduledTaskWorkerOptions> options)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _pollInterval = TimeSpan.FromSeconds(options.Value.PollIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Scheduled task worker started, polling every {PollInterval}",
            _pollInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _serviceProvider.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<IScheduledTaskService>();
                await service.ExecuteDueTasksAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled task worker loop");
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }

        _logger.LogInformation("Scheduled task worker stopped");
    }
}

public sealed class ScheduledTaskWorkerOptions
{
    public int PollIntervalSeconds { get; set; } = 60;
}

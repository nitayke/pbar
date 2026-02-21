using Pbar.Api.Contracts;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class PartitionService : IPartitionService
{
    private readonly IUnitOfWork _uow;

    public PartitionService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<TaskProgressDto> GetProgressAsync(string taskId)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId);
        if (task is null)
        {
            return new TaskProgressDto();
        }

        var counts = await _uow.Partitions.GetStatusCountsAsync(taskId);
        var ranges = await _uow.Ranges.GetByTaskIdAsync(taskId);
        var partitionSizeSeconds = task.PartitionSizeSeconds ?? 300;
        var expectedTotal = TaskStatusHelper.CalculateExpectedTotal(ranges, partitionSizeSeconds);

        return TaskStatusHelper.BuildProgress(counts, expectedTotal);
    }

    public async Task<object> GetPartitionsAsync(string taskId, int? skip, int? take)
    {
        var safeSkip = Math.Max(skip ?? 0, 0);
        var safeTake = Math.Clamp(take ?? 100, 1, 500);

        return await _uow.Partitions.GetByTaskIdAsync(taskId, safeSkip, safeTake);
    }

    public async Task ClearPartitionsAsync(string taskId)
    {
        await _uow.Partitions.DeleteByTaskIdAsync(taskId);
    }
}

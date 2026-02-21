using Pbar.Api.Contracts;
using Microsoft.Extensions.Options;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class PartitionService : IPartitionService
{
    private readonly IUnitOfWork _uow;
    private readonly PartitioningOptions _partitioningOptions;

    public PartitionService(IUnitOfWork uow, IOptions<PartitioningOptions> partitioningOptions)
    {
        _uow = uow;
        _partitioningOptions = partitioningOptions.Value;
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

    public async Task<(bool TaskExists, ClaimedPartitionDto? Partition)> ClaimNextPartitionAsync(string taskId)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId);
        if (task is null)
        {
            return (false, null);
        }

        var todoStatus = string.IsNullOrWhiteSpace(_partitioningOptions.PartitionStatusTodo)
            ? "TODO"
            : _partitioningOptions.PartitionStatusTodo.Trim();

        const string inProgressStatus = "IN_PROGRESS";

        var claimed = await _uow.Partitions.ClaimNextAsync(taskId, todoStatus, inProgressStatus);
        if (claimed is null)
        {
            return (true, null);
        }

        return (true, new ClaimedPartitionDto
        {
            TaskId = claimed.TaskId,
            TimeFrom = claimed.TimeFrom,
            TimeTo = claimed.TimeTo,
            Status = claimed.Status
        });
    }

    public async Task ClearPartitionsAsync(string taskId)
    {
        await _uow.Partitions.DeleteByTaskIdAsync(taskId);
    }
}

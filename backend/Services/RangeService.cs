using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Models;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class RangeService : IRangeService
{
    private readonly IUnitOfWork _uow;
    private readonly PartitioningOptions _partitioningOptions;

    public RangeService(IUnitOfWork uow, IOptions<PartitioningOptions> partitioningOptions)
    {
        _uow = uow;
        _partitioningOptions = partitioningOptions.Value;
    }

    public async Task<List<TaskRangeDto>> GetRangesAsync(string taskId)
    {
        var ranges = await _uow.Ranges.GetByTaskIdAsync(taskId);
        return ranges.Select(r => new TaskRangeDto
        {
            RangeId = r.RangeId,
            TimeFrom = r.TimeFrom,
            TimeTo = r.TimeTo,
            CreationTime = r.CreationTime,
            CreatedBy = r.CreatedBy
        }).ToList();
    }

    public async Task<(bool Success, string? Error)> AddRangeAsync(string taskId, TaskRangeDto range)
    {
        var task = await _uow.Tasks.GetByIdAsync(taskId);
        if (task is null)
            return (false, "NotFound");

        if (range.TimeFrom >= range.TimeTo)
            return (false, "TimeFrom must be before TimeTo");

        if (string.IsNullOrWhiteSpace(range.CreatedBy))
            return (false, "CreatedBy is required");

        var partitionSizeSeconds = task.PartitionSizeSeconds ?? _partitioningOptions.PartitionMinutes * 60;
        var todoStatus = string.IsNullOrWhiteSpace(_partitioningOptions.PartitionStatusTodo)
            ? "TODO"
            : _partitioningOptions.PartitionStatusTodo.Trim();

        var rangeEntity = new TaskTimeRange
        {
            RangeId = Guid.NewGuid().ToString("N"),
            TaskId = taskId,
            TimeFrom = range.TimeFrom,
            TimeTo = range.TimeTo,
            CreationTime = DateTime.UtcNow,
            CreatedBy = range.CreatedBy.Trim()
        };

        await _uow.BeginTransactionAsync();

        await _uow.Ranges.CreateAsync(rangeEntity);

        var partitions = GeneratePartitions(taskId, rangeEntity, partitionSizeSeconds, todoStatus);
        await CreatePartitionsInBatchesAsync(partitions);

        await _uow.CommitAsync();
        return (true, null);
    }

    public async Task DeleteRangeAsync(string taskId, DateTime from, DateTime to, string mode)
    {
        var normalized = mode.Trim().ToLowerInvariant();
        var targetRange = await _uow.Ranges.GetByIdentityAsync(taskId, from, to);

        if (normalized is "partitions" or "all")
        {
            if (targetRange is not null)
            {
                await _uow.Partitions.DeleteByRangeIdAsync(taskId, targetRange.RangeId);
            }
        }

        if (normalized is "range" or "all")
        {
            if (targetRange is not null)
            {
                await _uow.Ranges.DeleteByRangeIdAsync(targetRange.RangeId);
            }
            else
            {
                await _uow.Ranges.DeleteAsync(taskId, from, to);
            }
        }
    }

    private static IEnumerable<TaskPartition> GeneratePartitions(
        string taskId, TaskTimeRange range, int partitionSizeSeconds, string status)
    {
        var cursor = range.TimeFrom;
        while (cursor < range.TimeTo)
        {
            var next = cursor.AddSeconds(partitionSizeSeconds);
            if (next > range.TimeTo) next = range.TimeTo;

            yield return new TaskPartition
            {
                RangeId = range.RangeId,
                TaskId = taskId,
                TimeFrom = cursor,
                TimeTo = next,
                Status = status
            };

            cursor = next;
        }
    }

    private async Task CreatePartitionsInBatchesAsync(IEnumerable<TaskPartition> partitions)
    {
        const int batchSize = 2000;
        var batch = new List<TaskPartition>(batchSize);

        foreach (var partition in partitions)
        {
            batch.Add(partition);
            if (batch.Count >= batchSize)
            {
                await _uow.Partitions.CreateBatchAsync(batch);
                batch.Clear();
            }
        }

        if (batch.Count > 0)
        {
            await _uow.Partitions.CreateBatchAsync(batch);
        }
    }
}

using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Models;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class TaskService : ITaskService
{
    private readonly IUnitOfWork _uow;
    private readonly PartitioningOptions _partitioningOptions;

    public TaskService(IUnitOfWork uow, IOptions<PartitioningOptions> partitioningOptions)
    {
        _uow = uow;
        _partitioningOptions = partitioningOptions.Value;
    }

    public async Task<List<TaskSummaryDto>> GetTasksAsync(string? type, string? search, int? skip, int? take, bool includeProgress)
    {
        var safeSkip = Math.Max(skip ?? 0, 0);
        var safeTake = Math.Clamp(take ?? 100, 1, 500);

        var entities = await _uow.Tasks.GetAllAsync(type, search, safeSkip, safeTake);

        var tasks = entities.Select(t => new TaskSummaryDto
        {
            TaskId = t.TaskId,
            Description = t.Description,
            LastUpdate = t.LastUpdate,
            CreatedBy = t.CreatedBy,
            PartitionSizeSeconds = t.PartitionSizeSeconds,
            Type = TaskTypeHelper.GetType(t.TaskId)
        }).ToList();

        if (includeProgress && tasks.Count > 0)
        {
            var ids = tasks.Select(t => t.TaskId).ToArray();
            var countsMap = await _uow.Partitions.GetStatusCountsForTasksAsync(ids);
            var rangesMap = await _uow.Ranges.GetByTaskIdsAsync(ids);

            var expectedTotals = entities.ToDictionary(
                entity => entity.TaskId,
                entity =>
                {
                    var partitionSizeSeconds = entity.PartitionSizeSeconds ?? 300;
                    var ranges = rangesMap.TryGetValue(entity.TaskId, out var taskRanges)
                        ? taskRanges
                        : Enumerable.Empty<TaskTimeRange>();
                    return TaskStatusHelper.CalculateExpectedTotal(ranges, partitionSizeSeconds);
                },
                StringComparer.OrdinalIgnoreCase);

            var progressMap = TaskStatusHelper.BuildProgressMap(ids, countsMap, expectedTotals);

            foreach (var task in tasks)
            {
                if (progressMap.TryGetValue(task.TaskId, out var progress))
                {
                    task.Progress = progress;
                }
            }
        }

        return tasks;
    }

    public async Task<TaskSummaryDto?> GetTaskByIdAsync(string taskId)
    {
        var entity = await _uow.Tasks.GetByIdAsync(taskId);
        if (entity is null) return null;

        return new TaskSummaryDto
        {
            TaskId = entity.TaskId,
            Description = entity.Description,
            LastUpdate = entity.LastUpdate,
            CreatedBy = entity.CreatedBy,
            PartitionSizeSeconds = entity.PartitionSizeSeconds,
            Type = TaskTypeHelper.GetType(entity.TaskId)
        };
    }

    public async Task<string> CreateTaskAsync(TaskCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TaskId))
            throw new ArgumentException("TaskId is required.");

        if (await _uow.Tasks.ExistsAsync(request.TaskId))
            throw new InvalidOperationException("Task already exists.");

        if (request.Ranges is null || request.Ranges.Count == 0)
            throw new ArgumentException("At least one time range is required.");

        var partitionSizeSeconds = request.PartitionSizeSeconds
            ?? (request.PartitionMinutes.HasValue ? request.PartitionMinutes.Value * 60 : (int?)null)
            ?? _partitioningOptions.PartitionMinutes * 60;

        if (partitionSizeSeconds <= 0)
            throw new ArgumentException("PartitionSizeSeconds must be greater than zero.");

        var now = DateTime.UtcNow;
        var task = new TaskEntity
        {
            TaskId = request.TaskId,
            Description = request.Description ?? string.Empty,
            CreatedBy = request.CreatedBy ?? string.Empty,
            LastUpdate = now,
            PartitionSizeSeconds = partitionSizeSeconds
        };

        var rangeEntities = new List<TaskTimeRange>();
        foreach (var range in request.Ranges)
        {
            if (range.TimeTo <= range.TimeFrom)
                throw new ArgumentException("TimeTo must be after TimeFrom.");

            rangeEntities.Add(new TaskTimeRange
            {
                TaskId = request.TaskId,
                TimeFrom = range.TimeFrom,
                TimeTo = range.TimeTo,
                CreationTime = now
            });
        }

        var todoStatus = string.IsNullOrWhiteSpace(_partitioningOptions.PartitionStatusTodo)
            ? "TODO"
            : _partitioningOptions.PartitionStatusTodo.Trim();

        await _uow.BeginTransactionAsync();

        await _uow.Tasks.CreateAsync(task);
        await _uow.Ranges.CreateBatchAsync(rangeEntities);

        foreach (var range in rangeEntities)
        {
            var partitions = GeneratePartitions(request.TaskId, range, partitionSizeSeconds, todoStatus);
            await CreatePartitionsInBatchesAsync(partitions);
        }

        await _uow.CommitAsync();

        return request.TaskId;
    }

    public async Task<bool> DeleteTaskAsync(string taskId)
    {
        if (!await _uow.Tasks.ExistsAsync(taskId))
            return false;

        await _uow.BeginTransactionAsync();

        await _uow.Partitions.DeleteByTaskIdAsync(taskId);
        await _uow.Ranges.DeleteByTaskIdAsync(taskId);
        await _uow.Tasks.DeleteAsync(taskId);

        await _uow.CommitAsync();
        return true;
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

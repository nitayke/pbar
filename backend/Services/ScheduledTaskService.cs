using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pbar.Api.Contracts;
using Pbar.Api.Models;
using Pbar.Api.Repositories;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class ScheduledTaskService : IScheduledTaskService
{
    private readonly IUnitOfWork _uow;
    private readonly PartitioningOptions _partitioningOptions;
    private readonly ILogger<ScheduledTaskService> _logger;

    public ScheduledTaskService(
        IUnitOfWork uow,
        IOptions<PartitioningOptions> partitioningOptions,
        ILogger<ScheduledTaskService> logger)
    {
        _uow = uow;
        _partitioningOptions = partitioningOptions.Value;
        _logger = logger;
    }

    public async Task<List<ScheduledTaskDto>> GetAllAsync()
    {
        var schedules = await _uow.ScheduledTasks.GetAllAsync();
        return schedules.Select(MapToDto).ToList();
    }

    public async Task<List<ScheduledTaskDto>> GetByTaskIdAsync(string taskId)
    {
        var schedules = await _uow.ScheduledTasks.GetByTaskIdAsync(taskId);
        return schedules.Select(MapToDto).ToList();
    }

    public async Task<ScheduledTaskDto?> GetByIdAsync(string scheduleId)
    {
        var schedule = await _uow.ScheduledTasks.GetByIdAsync(scheduleId);
        return schedule is null ? null : MapToDto(schedule);
    }

    public async Task<ScheduledTaskDto> CreateAsync(ScheduledTaskCreateRequest request)
    {
        var task = await _uow.Tasks.GetByIdAsync(request.TaskId);
        if (task is null)
            throw new ArgumentException($"Task '{request.TaskId}' not found");

        if (request.IntervalSeconds <= 0)
            throw new ArgumentException("IntervalSeconds must be positive");

        if (request.BulkSizeSeconds <= 0)
            throw new ArgumentException("BulkSizeSeconds must be positive");

        var now = DateTime.UtcNow;
        var firstExec = request.FirstExecutionTime.HasValue
            ? DateTime.SpecifyKind(request.FirstExecutionTime.Value, DateTimeKind.Utc)
            : now;
        var schedule = new ScheduledTask
        {
            ScheduleId = Guid.NewGuid().ToString("N"),
            TaskId = request.TaskId.Trim(),
            IntervalSeconds = request.IntervalSeconds,
            BulkSizeSeconds = request.BulkSizeSeconds,
            LastExecutionTime = null,
            NextExecutionTime = firstExec,
            IsEnabled = true,
            CreatedAt = now,
            CreatedBy = string.IsNullOrWhiteSpace(request.CreatedBy) ? "system" : request.CreatedBy.Trim()
        };

        await _uow.ScheduledTasks.CreateAsync(schedule);

        _logger.LogInformation(
            "Created scheduled task {ScheduleId} for task {TaskId} with interval {Interval}s",
            schedule.ScheduleId, schedule.TaskId, schedule.IntervalSeconds);

        return MapToDto(schedule);
    }

    public async Task<ScheduledTaskDto?> UpdateAsync(string scheduleId, ScheduledTaskUpdateRequest request)
    {
        var schedule = await _uow.ScheduledTasks.GetByIdAsync(scheduleId);
        if (schedule is null)
            return null;

        if (request.IntervalSeconds.HasValue)
        {
            if (request.IntervalSeconds.Value <= 0)
                throw new ArgumentException("IntervalSeconds must be positive");
            schedule.IntervalSeconds = request.IntervalSeconds.Value;
        }

        if (request.BulkSizeSeconds.HasValue)
        {
            if (request.BulkSizeSeconds.Value <= 0)
                throw new ArgumentException("BulkSizeSeconds must be positive");
            schedule.BulkSizeSeconds = request.BulkSizeSeconds.Value;
        }

        if (request.IsEnabled.HasValue)
        {
            schedule.IsEnabled = request.IsEnabled.Value;
            if (schedule.IsEnabled && !schedule.NextExecutionTime.HasValue)
            {
                schedule.NextExecutionTime = DateTime.UtcNow;
            }
        }

        await _uow.ScheduledTasks.UpdateAsync(schedule);

        _logger.LogInformation(
            "Updated scheduled task {ScheduleId} (enabled={Enabled})",
            scheduleId, schedule.IsEnabled);

        return MapToDto(schedule);
    }

    public async Task<bool> DeleteAsync(string scheduleId)
    {
        var schedule = await _uow.ScheduledTasks.GetByIdAsync(scheduleId);
        if (schedule is null)
            return false;

        await _uow.ScheduledTasks.DeleteAsync(scheduleId);
        _logger.LogInformation("Deleted scheduled task {ScheduleId}", scheduleId);
        return true;
    }

    public async Task ExecuteDueTasksAsync()
    {
        var now = DateTime.UtcNow;
        var dueTasks = await _uow.ScheduledTasks.GetDueTasksAsync(now);

        foreach (var schedule in dueTasks)
        {
            try
            {
                await ExecuteScheduleAsync(schedule, now);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Error executing scheduled task {ScheduleId} for task {TaskId}",
                    schedule.ScheduleId, schedule.TaskId);
            }
        }
    }

    private async Task ExecuteScheduleAsync(ScheduledTask schedule, DateTime now)
    {
        var task = await _uow.Tasks.GetByIdAsync(schedule.TaskId);
        if (task is null)
        {
            _logger.LogWarning(
                "Task {TaskId} not found for schedule {ScheduleId}, disabling schedule",
                schedule.TaskId, schedule.ScheduleId);

            schedule.IsEnabled = false;
            schedule.NextExecutionTime = null;
            await _uow.ScheduledTasks.UpdateAsync(schedule);
            return;
        }

        var timeFrom = schedule.LastExecutionTime ?? now;
        var timeTo = timeFrom.AddSeconds(schedule.BulkSizeSeconds);

        var partitionSizeSeconds = task.PartitionSizeSeconds ?? _partitioningOptions.PartitionMinutes * 60;
        var todoStatus = string.IsNullOrWhiteSpace(_partitioningOptions.PartitionStatusTodo)
            ? "TODO"
            : _partitioningOptions.PartitionStatusTodo.Trim();

        var rangeEntity = new TaskTimeRange
        {
            RangeId = Guid.NewGuid().ToString("N"),
            TaskId = schedule.TaskId,
            TimeFrom = timeFrom,
            TimeTo = timeTo,
            CreationTime = now,
            CreatedBy = $"scheduled:{schedule.ScheduleId}"
        };

        await _uow.BeginTransactionAsync();

        await _uow.Ranges.CreateAsync(rangeEntity);

        var partitions = GeneratePartitions(schedule.TaskId, rangeEntity, partitionSizeSeconds, todoStatus);
        await CreatePartitionsInBatchesAsync(partitions);

        schedule.LastExecutionTime = timeTo;
        schedule.NextExecutionTime = now.AddSeconds(schedule.IntervalSeconds);
        await _uow.ScheduledTasks.UpdateAsync(schedule);

        await _uow.CommitAsync();

        _logger.LogInformation(
            "Executed schedule {ScheduleId}: created range {TimeFrom} to {TimeTo} for task {TaskId}",
            schedule.ScheduleId, timeFrom, timeTo, schedule.TaskId);
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

    private static ScheduledTaskDto MapToDto(ScheduledTask s) => new()
    {
        ScheduleId = s.ScheduleId,
        TaskId = s.TaskId,
        IntervalSeconds = s.IntervalSeconds,
        BulkSizeSeconds = s.BulkSizeSeconds,
        LastExecutionTime = s.LastExecutionTime,
        NextExecutionTime = s.NextExecutionTime,
        IsEnabled = s.IsEnabled,
        CreatedAt = s.CreatedAt,
        CreatedBy = s.CreatedBy
    };
}

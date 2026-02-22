using Pbar.Api.Contracts;
using Pbar.Api.Models;
using Pbar.Api.Repositories;

namespace Pbar.Api.Services;

public static class TaskStatusHelper
{
    private static readonly string[] DoneStatuses = { "done", "complete", "completed" };
    private static readonly string[] InProgressStatuses = { "in_progress", "inprogress", "running" };

    public static TaskProgressDto BuildProgress(IEnumerable<StatusCount> counts, long expectedTotal)
    {
        var progress = new TaskProgressDto
        {
            Total = Math.Max(0, expectedTotal)
        };

        foreach (var item in counts)
        {
            ApplyCount(progress, item.Status, item.Count);
        }

        Normalize(progress);
        FinalizePercentages(progress);
        return progress;
    }

    public static Dictionary<string, TaskProgressDto> BuildProgressMap(
        IEnumerable<string> taskIds,
        Dictionary<string, List<StatusCount>> countsMap,
        Dictionary<string, long> expectedTotals)
    {
        var map = new Dictionary<string, TaskProgressDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var taskId in taskIds)
        {
            countsMap.TryGetValue(taskId, out var counts);
            expectedTotals.TryGetValue(taskId, out var expectedTotal);

            var progress = new TaskProgressDto
            {
                Total = Math.Max(0, expectedTotal)
            };

            foreach (var item in counts ?? Enumerable.Empty<StatusCount>())
            {
                ApplyCount(progress, item.Status, item.Count);
            }

            Normalize(progress);
            FinalizePercentages(progress);
            map[taskId] = progress;
        }

        return map;
    }

    public static long CalculateExpectedTotal(IEnumerable<TaskTimeRange> ranges, int partitionSizeSeconds)
    {
        if (partitionSizeSeconds <= 0)
        {
            return 0;
        }

        var stepTicks = TimeSpan.FromSeconds(partitionSizeSeconds).Ticks;
        long total = 0;

        foreach (var range in ranges)
        {
            var spanTicks = range.TimeTo.Ticks - range.TimeFrom.Ticks;
            if (spanTicks <= 0)
            {
                continue;
            }

            total += (spanTicks + stepTicks - 1) / stepTicks;
        }

        return total;
    }

    private static void ApplyCount(TaskProgressDto progress, string status, long count)
    {
        if (count <= 0)
        {
            return;
        }

        var normalized = status.ToLowerInvariant();
        if (DoneStatuses.Contains(normalized))
        {
            return;
        }

        if (InProgressStatuses.Contains(normalized))
        {
            progress.InProgress += count;
            return;
        }

        progress.Todo += count;
    }

    private static void Normalize(TaskProgressDto progress)
    {
        var remaining = progress.InProgress + progress.Todo;
        if (remaining > progress.Total)
        {
            var overflow = remaining - progress.Total;
            if (progress.Todo >= overflow)
            {
                progress.Todo -= overflow;
            }
            else
            {
                overflow -= progress.Todo;
                progress.Todo = 0;
                progress.InProgress = Math.Max(0, progress.InProgress - overflow);
            }
        }

        progress.Done = Math.Max(0, progress.Total - progress.InProgress - progress.Todo);
    }

    private static void FinalizePercentages(TaskProgressDto progress)
    {
        if (progress.Total == 0)
        {
            return;
        }

        progress.PercentDone = Math.Round(progress.Done * 100.0 / progress.Total, 2);
        progress.PercentInProgress = Math.Round(progress.InProgress * 100.0 / progress.Total, 2);
        progress.PercentTodo = Math.Round(progress.Todo * 100.0 / progress.Total, 2);
    }
}

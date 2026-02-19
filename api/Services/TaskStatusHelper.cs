using Pbar.Api.Contracts;

namespace Pbar.Api.Services;

public static class TaskStatusHelper
{
    private static readonly string[] DoneStatuses = { "done", "complete", "completed" };
    private static readonly string[] InProgressStatuses = { "in_progress", "inprogress", "running" };

    public static TaskProgressDto BuildProgress(IEnumerable<dynamic> counts)
    {
        var progress = new TaskProgressDto();
        foreach (var item in counts)
        {
            var status = ((string?)item.Status) ?? string.Empty;
            var count = (long)item.Count;
            ApplyCount(progress, status, count);
        }

        FinalizePercentages(progress);
        return progress;
    }

    public static Dictionary<string, TaskProgressDto> BuildProgressMap(IEnumerable<dynamic> counts)
    {
        var map = new Dictionary<string, TaskProgressDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in counts)
        {
            var taskId = (string)item.TaskId;
            var status = ((string?)item.Status) ?? string.Empty;
            var count = (long)item.Count;

            if (!map.TryGetValue(taskId, out var progress))
            {
                progress = new TaskProgressDto();
                map[taskId] = progress;
            }

            ApplyCount(progress, status, count);
        }

        foreach (var progress in map.Values)
        {
            FinalizePercentages(progress);
        }

        return map;
    }

    private static void ApplyCount(TaskProgressDto progress, string status, long count)
    {
        progress.Total += count;
        var normalized = status.ToLowerInvariant();
        if (DoneStatuses.Contains(normalized))
        {
            progress.Done += count;
            return;
        }

        if (InProgressStatuses.Contains(normalized))
        {
            progress.InProgress += count;
            return;
        }

        progress.Todo += count;
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

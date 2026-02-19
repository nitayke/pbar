using Pbar.Api.Contracts;
using Pbar.Api.Repositories;

namespace Pbar.Api.Services;

public static class TaskStatusHelper
{
    private static readonly string[] DoneStatuses = { "done", "complete", "completed" };
    private static readonly string[] InProgressStatuses = { "in_progress", "inprogress", "running" };

    public static TaskProgressDto BuildProgress(IEnumerable<StatusCount> counts)
    {
        var progress = new TaskProgressDto();
        foreach (var item in counts)
        {
            ApplyCount(progress, item.Status, item.Count);
        }

        FinalizePercentages(progress);
        return progress;
    }

    public static Dictionary<string, TaskProgressDto> BuildProgressMap(Dictionary<string, List<StatusCount>> countsMap)
    {
        var map = new Dictionary<string, TaskProgressDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var (taskId, counts) in countsMap)
        {
            var progress = new TaskProgressDto();
            foreach (var item in counts)
            {
                ApplyCount(progress, item.Status, item.Count);
            }
            FinalizePercentages(progress);
            map[taskId] = progress;
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

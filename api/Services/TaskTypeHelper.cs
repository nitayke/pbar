using Pbar.Api.Models;

namespace Pbar.Api.Services;

public static class TaskTypeHelper
{
    public static string GetType(string taskId)
    {
        var normalized = taskId.ToLowerInvariant();
        if (normalized.Contains("reflow"))
        {
            return "reflow";
        }

        if (normalized.Contains("hermetics"))
        {
            return "hermetics";
        }

        return "other";
    }

    public static IQueryable<TaskEntity> ApplyTypeFilter(IQueryable<TaskEntity> query, string normalizedType)
    {
        if (normalizedType == "reflow")
        {
            return query.Where(task => task.TaskId.ToLower().Contains("reflow"));
        }

        if (normalizedType == "hermetics")
        {
            return query.Where(task => task.TaskId.ToLower().Contains("hermetics"));
        }

        if (normalizedType == "other")
        {
            return query.Where(task => !task.TaskId.ToLower().Contains("reflow") && !task.TaskId.ToLower().Contains("hermetics"));
        }

        return query;
    }
}

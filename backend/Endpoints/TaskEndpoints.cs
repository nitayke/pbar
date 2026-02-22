using Pbar.Api.Contracts;
using Pbar.Api.Services;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class TaskEndpoints
{
    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks", async (
            ITaskService taskService,
            string? type,
            string? search,
            string? createdBy,
            int? skip,
            int? take,
            bool? includeProgress) =>
        {
            var tasks = await taskService.GetTasksAsync(type, search, createdBy, skip, take, includeProgress == true);
            return Results.Ok(tasks);
        });

        app.MapGet("/api/tasks/{taskId}", async (string taskId, ITaskService taskService) =>
        {
            var task = await taskService.GetTaskByIdAsync(taskId);
            return task is null ? Results.NotFound() : Results.Ok(task);
        });

        app.MapGet("/api/tasks/{taskId}/metrics", (string taskId, TaskMetricsCache cache) =>
        {
            return Results.Ok(cache.Get(taskId));
        });

        app.MapPost("/api/tasks", async (TaskCreateRequest request, ITaskService taskService) =>
        {
            try
            {
                var taskId = await taskService.CreateTaskAsync(request);
                return Results.Created($"/api/tasks/{taskId}", new { TaskId = taskId });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ex.Message);
            }
        });

        app.MapDelete("/api/tasks/{taskId}", async (string taskId, ITaskService taskService) =>
        {
            var deleted = await taskService.DeleteTaskAsync(taskId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }
}

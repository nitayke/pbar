using Microsoft.AspNetCore.Mvc;
using Pbar.Api.Contracts;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class ScheduledTaskEndpoints
{
    public static void MapScheduledTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/schedules");

        group.MapGet("/", GetAllAsync);
        group.MapGet("/{scheduleId}", GetByIdAsync);
        group.MapGet("/task/{taskId}", GetByTaskIdAsync);
        group.MapPost("/", CreateAsync);
        group.MapPatch("/{scheduleId}", UpdateAsync);
        group.MapDelete("/{scheduleId}", DeleteAsync);
        group.MapPost("/execute-due", ExecuteDueAsync);
    }

    private static async Task<IResult> GetAllAsync(
        [FromServices] IScheduledTaskService service)
    {
        var schedules = await service.GetAllAsync();
        return Results.Ok(schedules);
    }

    private static async Task<IResult> GetByIdAsync(
        string scheduleId,
        [FromServices] IScheduledTaskService service)
    {
        var schedule = await service.GetByIdAsync(scheduleId);
        return schedule is null
            ? Results.NotFound()
            : Results.Ok(schedule);
    }

    private static async Task<IResult> GetByTaskIdAsync(
        string taskId,
        [FromServices] IScheduledTaskService service)
    {
        var schedules = await service.GetByTaskIdAsync(taskId);
        return Results.Ok(schedules);
    }

    private static async Task<IResult> CreateAsync(
        [FromBody] ScheduledTaskCreateRequest request,
        [FromServices] IScheduledTaskService service)
    {
        try
        {
            var schedule = await service.CreateAsync(request);
            return Results.Created($"/api/schedules/{schedule.ScheduleId}", schedule);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(ex.Message);
        }
    }

    private static async Task<IResult> UpdateAsync(
        string scheduleId,
        [FromBody] ScheduledTaskUpdateRequest request,
        [FromServices] IScheduledTaskService service)
    {
        try
        {
            var schedule = await service.UpdateAsync(scheduleId, request);
            return schedule is null
                ? Results.NotFound()
                : Results.Ok(schedule);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(ex.Message);
        }
    }

    private static async Task<IResult> DeleteAsync(
        string scheduleId,
        [FromServices] IScheduledTaskService service)
    {
        var deleted = await service.DeleteAsync(scheduleId);
        return deleted ? Results.NoContent() : Results.NotFound();
    }

    private static async Task<IResult> ExecuteDueAsync(
        [FromServices] IScheduledTaskService service)
    {
        await service.ExecuteDueTasksAsync();
        return Results.Ok();
    }
}

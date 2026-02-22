using Pbar.Api.Contracts;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class RangeEndpoints
{
    public static IEndpointRouteBuilder MapRangeEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks/{taskId}/ranges", async (string taskId, IRangeService rangeService) =>
        {
            var ranges = await rangeService.GetRangesAsync(taskId);
            return Results.Ok(ranges);
        });

        app.MapPost("/api/tasks/{taskId}/ranges", async (
            string taskId,
            TaskRangeDto range,
            IRangeService rangeService) =>
        {
            var (success, error) = await rangeService.AddRangeAsync(taskId, range);

            if (!success && error == "NotFound")
                return Results.NotFound();

            if (!success)
                return Results.BadRequest(new { error });

            return Results.Created($"/api/tasks/{taskId}/ranges", range);
        });

        app.MapDelete("/api/tasks/{taskId}/ranges", async (
            string taskId,
            DateTime from,
            DateTime to,
            string? delete,
            IRangeService rangeService) =>
        {
            var mode = (delete ?? "all").Trim().ToLowerInvariant();
            await rangeService.DeleteRangeAsync(taskId, from, to, mode);
            return Results.NoContent();
        });

        return app;
    }
}

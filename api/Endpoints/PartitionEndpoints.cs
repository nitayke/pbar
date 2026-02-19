using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class PartitionEndpoints
{
    public static IEndpointRouteBuilder MapPartitionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks/{taskId}/progress", async (string taskId, IPartitionService partitionService) =>
        {
            var progress = await partitionService.GetProgressAsync(taskId);
            return Results.Ok(progress);
        });

        app.MapGet("/api/tasks/{taskId}/partitions", async (
            string taskId,
            int? skip,
            int? take,
            IPartitionService partitionService) =>
        {
            var partitions = await partitionService.GetPartitionsAsync(taskId, skip, take);
            return Results.Ok(partitions);
        });

        app.MapDelete("/api/tasks/{taskId}/partitions", async (string taskId, IPartitionService partitionService) =>
        {
            await partitionService.ClearPartitionsAsync(taskId);
            return Results.NoContent();
        });

        return app;
    }
}

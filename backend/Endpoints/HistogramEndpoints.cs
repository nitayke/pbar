using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class HistogramEndpoints
{
    public static IEndpointRouteBuilder MapHistogramEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/tasks/{taskId}/status-histogram", async (
            string taskId,
            int? intervalSeconds,
            DateTime? from,
            DateTime? to,
            IHistogramService histogramService) =>
        {
            var histogram = await histogramService.GetHistogramAsync(taskId, intervalSeconds, from, to);
            return histogram is null ? Results.NotFound() : Results.Ok(histogram);
        });

        return app;
    }
}

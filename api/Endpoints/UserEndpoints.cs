using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/users", (string? query, IUserService userService) =>
        {
            return Results.Ok(userService.Search(query));
        });

        return app;
    }
}

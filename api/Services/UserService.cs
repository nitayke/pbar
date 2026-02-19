using Microsoft.Extensions.Options;
using Pbar.Api.Services.Interfaces;

namespace Pbar.Api.Services;

public sealed class UserService : IUserService
{
    private readonly string[] _values;

    public UserService(IOptions<UserAutocompleteOptions> options)
    {
        _values = options.Value.Values ?? Array.Empty<string>();
    }

    public IEnumerable<string> Search(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return _values.Take(20);

        return _values
            .Where(v => v.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(20);
    }
}

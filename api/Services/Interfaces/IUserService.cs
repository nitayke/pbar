namespace Pbar.Api.Services.Interfaces;

public interface IUserService
{
    IEnumerable<string> Search(string? query);
}

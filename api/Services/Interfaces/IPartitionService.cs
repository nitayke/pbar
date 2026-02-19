using Pbar.Api.Contracts;

namespace Pbar.Api.Services.Interfaces;

public interface IPartitionService
{
    Task<TaskProgressDto> GetProgressAsync(string taskId);
    Task<object> GetPartitionsAsync(string taskId, int? skip, int? take);
    Task ClearPartitionsAsync(string taskId);
}

using Pbar.Api.Contracts;

namespace Pbar.Api.Services.Interfaces;

public interface IHistogramService
{
    Task<TaskStatusHistogramDto?> GetHistogramAsync(string taskId, int? intervalSeconds, DateTime? from, DateTime? to);
}

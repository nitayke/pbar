namespace Pbar.Api.Repositories;

public interface IUnitOfWork : IAsyncDisposable
{
    ITaskRepository Tasks { get; }
    IPartitionRepository Partitions { get; }
    IRangeRepository Ranges { get; }
    IScheduledTaskRepository ScheduledTasks { get; }
    Task BeginTransactionAsync();
    Task CommitAsync();
    Task SaveChangesAsync();
}

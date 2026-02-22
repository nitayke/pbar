using Microsoft.EntityFrameworkCore;
using Pbar.Api.Data;

namespace Pbar.Api.Repositories;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;
    private Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? _transaction;

    public ITaskRepository Tasks { get; }
    public IPartitionRepository Partitions { get; }
    public IRangeRepository Ranges { get; }

    public UnitOfWork(IDbContextFactory<AppDbContext> factory)
    {
        _db = factory.CreateDbContext();
        Tasks = new TaskRepository(_db);
        Partitions = new PartitionRepository(_db);
        Ranges = new RangeRepository(_db);
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _db.Database.BeginTransactionAsync();
    }

    public async Task CommitAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.CommitAsync();
        }
    }

    public async Task SaveChangesAsync()
    {
        await _db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (_transaction is not null)
        {
            await _transaction.DisposeAsync();
        }

        _db.Dispose();
    }
}

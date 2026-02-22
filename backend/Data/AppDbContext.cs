using Microsoft.EntityFrameworkCore;
using Pbar.Api.Models;

namespace Pbar.Api.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<TaskEntity> Tasks => Set<TaskEntity>();
    public DbSet<TaskPartition> TaskPartitions => Set<TaskPartition>();
    public DbSet<TaskTimeRange> TaskTimeRanges => Set<TaskTimeRange>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskEntity>(builder =>
        {
            builder.ToTable("TASKS");
            builder.HasKey(t => t.TaskId);
            builder.Property(t => t.TaskId).HasColumnName("TASK_ID");
            builder.Property(t => t.Description).HasColumnName("DESCRIPTION");
            builder.Property(t => t.LastUpdate).HasColumnName("LAST_UPDATE");
            builder.Property(t => t.PartitionSizeSeconds).HasColumnName("PARTITION_SIZE_SECONDS");
        });

        modelBuilder.Entity<TaskPartition>(builder =>
        {
            builder.ToTable("TASK_PARTITIONS");
            builder.HasKey(p => new { p.TaskId, p.TimeFrom, p.TimeTo });
            builder.Property(p => p.RangeId).HasColumnName("RANGE_ID");
            builder.Property(p => p.TaskId).HasColumnName("TASK_ID");
            builder.Property(p => p.TimeFrom).HasColumnName("TIME_FROM");
            builder.Property(p => p.TimeTo).HasColumnName("TIME_TO");
            builder.Property(p => p.Status).HasColumnName("STATUS");
        });

        modelBuilder.Entity<TaskTimeRange>(builder =>
        {
            builder.ToTable("TASK_TIME_RANGES");
            builder.HasKey(r => r.RangeId);
            builder.Property(r => r.RangeId).HasColumnName("RANGE_ID").IsRequired();
            builder.Property(r => r.TaskId).HasColumnName("TASK_ID");
            builder.Property(r => r.TimeFrom).HasColumnName("TIME_FROM");
            builder.Property(r => r.TimeTo).HasColumnName("TIME_TO");
            builder.Property(r => r.CreationTime).HasColumnName("CREATION_TIME");
            builder.Property(r => r.CreatedBy).HasColumnName("CREATED_BY");
            builder.HasIndex(r => new { r.TaskId, r.TimeFrom, r.TimeTo }).IsUnique();
        });

        modelBuilder.Entity<ScheduledTask>(builder =>
        {
            builder.ToTable("SCHEDULED_TASKS");
            builder.HasKey(s => s.ScheduleId);
            builder.Property(s => s.ScheduleId).HasColumnName("SCHEDULE_ID").IsRequired();
            builder.Property(s => s.TaskId).HasColumnName("TASK_ID");
            builder.Property(s => s.IntervalSeconds).HasColumnName("INTERVAL_SECONDS");
            builder.Property(s => s.BulkSizeSeconds).HasColumnName("BULK_SIZE_SECONDS");
            builder.Property(s => s.LastExecutionTime).HasColumnName("LAST_EXECUTION_TIME");
            builder.Property(s => s.NextExecutionTime).HasColumnName("NEXT_EXECUTION_TIME");
            builder.Property(s => s.IsEnabled).HasColumnName("IS_ENABLED");
            builder.Property(s => s.CreatedAt).HasColumnName("CREATED_AT");
            builder.Property(s => s.CreatedBy).HasColumnName("CREATED_BY");
            builder.HasIndex(s => s.TaskId);
            builder.HasIndex(s => new { s.IsEnabled, s.NextExecutionTime });
        });
    }
}

using System.Collections.Concurrent;
using Pbar.Api.Contracts;

namespace Pbar.Api.Services;

public sealed class TaskMetricsCache
{
    private readonly ConcurrentDictionary<string, List<TaskMetricSampleDto>> _samples = new(StringComparer.OrdinalIgnoreCase);

    public void AddSample(string taskId, TaskMetricSampleDto sample, int maxSamples)
    {
        var list = _samples.GetOrAdd(taskId, _ => new List<TaskMetricSampleDto>());
        lock (list)
        {
            list.Add(sample);
            if (list.Count > maxSamples)
            {
                list.RemoveRange(0, list.Count - maxSamples);
            }
        }
    }

    public TaskMetricsDto Get(string taskId)
    {
        var result = new TaskMetricsDto();
        if (_samples.TryGetValue(taskId, out var list))
        {
            lock (list)
            {
                result.Samples = list.Select(sample => new TaskMetricSampleDto
                {
                    TimestampUtc = sample.TimestampUtc,
                    Done = sample.Done,
                    Total = sample.Total
                }).ToList();
            }
        }

        if (result.Samples.Count >= 2)
        {
            var first = result.Samples.First();
            var last = result.Samples.Last();
            var minutes = (last.TimestampUtc - first.TimestampUtc).TotalMinutes;
            if (minutes > 0)
            {
                var deltaDone = last.Done - first.Done;
                result.PartitionsPerMinute = Math.Round(deltaDone / minutes, 2);
            }
        }

        if (result.Samples.Count > 0)
        {
            var last = result.Samples.Last();
            result.Progress = new TaskProgressDto
            {
                Total = last.Total,
                Done = last.Done,
                InProgress = 0,
                Todo = Math.Max(0, last.Total - last.Done)
            };

            if (result.Progress.Total > 0)
            {
                result.Progress.PercentDone = Math.Round(result.Progress.Done * 100.0 / result.Progress.Total, 2);
                result.Progress.PercentTodo = Math.Round(result.Progress.Todo * 100.0 / result.Progress.Total, 2);
            }
        }

        if (result.PartitionsPerMinute.HasValue && result.Progress.Total > 0)
        {
            var remaining = result.Progress.Todo;
            var rate = result.PartitionsPerMinute.Value;
            if (rate > 0)
            {
                var minutesRemaining = remaining / rate;
                result.EstimatedMinutesRemaining = Math.Round(minutesRemaining, 1);
                result.EstimatedFinishUtc = DateTime.UtcNow.AddMinutes(minutesRemaining);
            }
        }

        return result;
    }
}

import { useEffect, useMemo, useState } from "react";
import type { TaskStatusHistogram } from "../types";

type Props = {
  histogram: TaskStatusHistogram | null;
  isLoading?: boolean;
};

const preferredStatusOrder = ["done", "completed", "complete", "in_progress", "inprogress", "running", "todo"];

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "done" || normalized === "completed" || normalized === "complete") {
    return "bg-emerald-400";
  }
  if (normalized === "in_progress" || normalized === "inprogress" || normalized === "running") {
    return "bg-amber-400";
  }
  if (normalized === "todo") {
    return "bg-slate-400";
  }
  return "bg-cyan-400";
};

const sortStatuses = (statuses: string[]) =>
  statuses.sort((left, right) => {
    const leftIndex = preferredStatusOrder.indexOf(left);
    const rightIndex = preferredStatusOrder.indexOf(right);
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }
    return left.localeCompare(right);
  });

export default function StatusHistogramChart({ histogram, isLoading }: Props) {
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const buckets = histogram?.buckets ?? [];
  const bucketCount = buckets.length;
  const slidersDisabled = bucketCount <= 1;

  useEffect(() => {
    if (bucketCount === 0) {
      setRangeStart(0);
      setRangeEnd(0);
      return;
    }

    setRangeStart(0);
    setRangeEnd(bucketCount - 1);
  }, [bucketCount]);
  const startIndex = Math.min(rangeStart, Math.max(0, bucketCount - 1));
  const endIndex = Math.max(rangeEnd, startIndex + 1);

  const visibleBuckets = useMemo(
    () => buckets.slice(startIndex, endIndex + 1),
    [buckets, startIndex, endIndex]
  );

  const allStatuses = sortStatuses(
    Array.from(
      new Set(
        visibleBuckets.flatMap(bucket =>
          bucket.statuses.map(statusEntry => statusEntry.status.toLowerCase())
        )
      )
    )
  );

  const totals = visibleBuckets.map(bucket =>
    bucket.statuses.reduce((sum, statusEntry) => sum + statusEntry.count, 0)
  );
  const maxTotal = Math.max(1, ...totals);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString();

  const axisLabels = useMemo(() => {
    if (visibleBuckets.length === 0) {
      return [] as string[];
    }

    const first = new Date(visibleBuckets[0].timestampUtc);
    const last = new Date(visibleBuckets[visibleBuckets.length - 1].timestampUtc);
    const mid = new Date(visibleBuckets[Math.floor(visibleBuckets.length / 2)].timestampUtc);
    const sameDay = formatDate(first) === formatDate(last);

    return [
      `${formatTime(first)}${sameDay ? "" : ` ${formatDate(first)}`}`,
      `${formatTime(mid)}`,
      `${formatTime(last)}${sameDay ? "" : ` ${formatDate(last)}`}`
    ];
  }, [visibleBuckets]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="mt-4 flex h-40 items-end gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
          <div className="h-16 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-24 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-20 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-28 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-14 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
        </div>
      </div>
    );
  }

  if (bucketCount === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="mt-4 flex h-40 items-end gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4" dir="ltr">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="text-xs text-slate-400">bucket: {histogram.intervalSeconds}s</div>
      </div>

      <div className="mt-4 flex h-40 items-end gap-1 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
        {visibleBuckets.map(bucket => {
          const bucketTotal = bucket.statuses.reduce((sum, statusEntry) => sum + statusEntry.count, 0);
          const barHeightPercent = (bucketTotal / maxTotal) * 100;

          return (
            <div
              key={bucket.timestampUtc}
              className="flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-sm"
              style={{ height: `${Math.max(6, barHeightPercent)}%` }}
              title={`${new Date(bucket.timestampUtc).toLocaleString()} | total: ${bucketTotal}`}
            >
              {allStatuses.map(status => {
                const count = bucket.statuses.find(entry => entry.status.toLowerCase() === status)?.count ?? 0;
                if (count <= 0 || bucketTotal <= 0) {
                  return null;
                }

                return (
                  <div
                    key={`${bucket.timestampUtc}-${status}`}
                    className={getStatusClass(status)}
                    style={{ height: `${(count / bucketTotal) * 100}%` }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        {axisLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">טווח התחלה</div>
          <input
            type="range"
            min={0}
            max={Math.max(0, bucketCount - 2)}
            value={startIndex}
            disabled={slidersDisabled}
            onChange={event => {
              const next = Math.min(Number(event.target.value), endIndex - 1);
              setRangeStart(next);
            }}
            className="w-full accent-cyan-400"
          />
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">טווח סיום</div>
          <input
            type="range"
            min={1}
            max={Math.max(1, bucketCount - 1)}
            value={endIndex}
            disabled={slidersDisabled}
            onChange={event => {
              const next = Math.max(Number(event.target.value), startIndex + 1);
              setRangeEnd(next);
            }}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
        {allStatuses.map(status => (
          <div key={status} className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${getStatusClass(status)}`} />
            <span>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { TaskStatusHistogram } from "../types";

type Props = {
  histogram: TaskStatusHistogram | null;
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

export default function StatusHistogramChart({ histogram }: Props) {
  if (!histogram || histogram.buckets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="mt-4 text-sm text-slate-400">אין נתוני התפלגות להצגה.</div>
      </div>
    );
  }

  const allStatuses = sortStatuses(
    Array.from(
      new Set(
        histogram.buckets.flatMap(bucket =>
          bucket.statuses.map(statusEntry => statusEntry.status.toLowerCase())
        )
      )
    )
  );

  const totals = histogram.buckets.map(bucket =>
    bucket.statuses.reduce((sum, statusEntry) => sum + statusEntry.count, 0)
  );
  const maxTotal = Math.max(1, ...totals);

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="text-xs text-slate-400">bucket: {histogram.intervalSeconds}s</div>
      </div>

      <div className="mt-4 flex h-40 items-end gap-1 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
        {histogram.buckets.map(bucket => {
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

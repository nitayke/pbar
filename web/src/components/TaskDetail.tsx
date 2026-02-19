import type { TaskProgress, TaskRange, TaskStatusHistogram, TaskSummary } from "../types";
import ProgressBar from "./ProgressBar";
import StatusHistogramChart from "./StatusHistogramChart";

type Props = {
  task: TaskSummary | null;
  progress: TaskProgress | null;
  histogram: TaskStatusHistogram | null;
  isHistogramLoading: boolean;
  ranges: TaskRange[];
  onDeleteTask: () => void;
  onClearPartitions: () => void;
  onDeleteRange: (range: TaskRange, mode: string) => void;
  onAddRange: () => void;
  onHistogramZoom?: (from: Date, to: Date) => void;
  isDeletingTask: boolean;
  isClearingPartitions: boolean;
  deletingRangeKey: string | null;
  deletingRangeMode: string | null;
  rangeDoneKey: string | null;
  rangeDoneMode: string | null;
  actionNote: string | null;
};

export default function TaskDetail({
  task,
  progress,
  histogram,
  isHistogramLoading,
  ranges,
  onDeleteTask,
  onClearPartitions,
  onDeleteRange,
  onAddRange,
  onHistogramZoom,
  isDeletingTask,
  isClearingPartitions,
  deletingRangeKey,
  deletingRangeMode,
  rangeDoneKey,
  rangeDoneMode,
  actionNote
}: Props) {
  if (!task) {
    return (
      <div className="glass grid-glow rounded-3xl p-8 text-slate-200">
        <div className="text-lg">בחר משימה להצגת פרטים.</div>
      </div>
    );
  }

  const typeLabel =
    task.type === "reflow" ? "ריפלו" : task.type === "hermetics" ? "הרמטיות" : "אחר";
  const effectiveProgress = progress ?? task.progress;

  return (
    <div className="glass grid-glow rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-white">{task.taskId}</div>
          <div className="text-sm text-slate-400">{task.description}</div>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{typeLabel}</div>
      </div>

      <div className="mt-4">
        <ProgressBar progress={effectiveProgress} />
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
          <span>הושלמו: {effectiveProgress?.done ?? 0}</span>
          <span>בתהליך: {effectiveProgress?.inProgress ?? 0}</span>
          <span>לביצוע: {effectiveProgress?.todo ?? 0}</span>
          <span>סה"כ: {effectiveProgress?.total ?? 0}</span>
          <span>גודל חלוקה: {task.partitionSizeSeconds ?? "-"} שניות</span>
        </div>
      </div>

      <div className="mt-6">
        <StatusHistogramChart 
          histogram={histogram} 
          isLoading={isHistogramLoading}
          taskId={task.taskId}
          partitionSizeSeconds={task.partitionSizeSeconds}
          onZoomRange={onHistogramZoom}
        />
      </div>

      {actionNote && <div className="mt-4 text-xs text-emerald-200">{actionNote}</div>}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">טווחים</div>
          <button
            type="button"
            onClick={onAddRange}
            className="btn-hover rounded-lg border border-emerald-500/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200"
          >
            הוסף טווח
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {ranges.length === 0 && (
            <div className="space-y-2">
              <div className="h-12 w-full animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/70" />
              <div className="h-12 w-full animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/70" />
            </div>
          )}
          {ranges.map(range => {
            const from = new Date(range.timeFrom);
            const to = new Date(range.timeTo);
            const diffMs = to.getTime() - from.getTime();
            const diffH = Math.floor(diffMs / 3_600_000);
            const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
            const durationParts: string[] = [];
            if (diffH > 0) durationParts.push(`${diffH} שעות`);
            if (diffM > 0) durationParts.push(`${diffM} דקות`);
            if (durationParts.length === 0) durationParts.push("פחות מדקה");
            const duration = durationParts.join(" ו-");
            const fmtDate = (d: Date) => d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
            const fmtTime = (d: Date) => d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const rangeKey = `${range.timeFrom}-${range.timeTo}`;
            const isDeletingPartitions = deletingRangeKey === rangeKey && deletingRangeMode === "partitions";
            const isDeletingRange = deletingRangeKey === rangeKey && deletingRangeMode === "range";
            const isDonePartitions = rangeDoneKey === rangeKey && rangeDoneMode === "partitions";
            const isDoneRange = rangeDoneKey === rangeKey && rangeDoneMode === "range";

            return (
            <div key={rangeKey} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <span className="text-slate-500">מ:</span>
                <span className="text-slate-200 tabular-nums">
                  <span className="font-medium">{fmtDate(from)}</span>
                  <span className="mx-1.5 text-slate-600">|</span>
                  <span>{fmtTime(from)}</span>
                </span>
                <span className="text-slate-500">עד:</span>
                <span className="text-slate-200 tabular-nums">
                  <span className="font-medium">{fmtDate(to)}</span>
                  <span className="mx-1.5 text-slate-600">|</span>
                  <span>{fmtTime(to)}</span>
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                משך: <span className="text-slate-400">{duration}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDeleteRange(range, "partitions")}
                  disabled={isDeletingPartitions || isDonePartitions}
                  className="btn-hover rounded-lg border border-amber-400/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100"
                >
                  {isDeletingPartitions ? "מוחק..." : isDonePartitions ? "נמחק" : "מחק פרטישנים"}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRange(range, "range")}
                  disabled={isDeletingRange || isDoneRange}
                  className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
                >
                  {isDeletingRange ? "מוחק..." : isDoneRange ? "נמחק" : "מחק טווח"}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onClearPartitions}
          disabled={isClearingPartitions}
          className="btn-hover rounded-xl border border-amber-400/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-amber-100"
        >
          {isClearingPartitions ? "מנקה..." : "נקה פרטישנים"}
        </button>
        <button
          type="button"
          onClick={onDeleteTask}
          disabled={isDeletingTask}
          className="btn-hover rounded-xl border border-rose-500/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200"
        >
          {isDeletingTask ? "מוחק..." : "מחק משימה"}
        </button>
      </div>
    </div>
  );
}

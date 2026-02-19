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
        <StatusHistogramChart histogram={histogram} isLoading={isHistogramLoading} />
      </div>

      {actionNote && <div className="mt-4 text-xs text-emerald-200">{actionNote}</div>}

      <div className="mt-6">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">טווחים</div>
        <div className="mt-3 space-y-3">
          {ranges.length === 0 && (
            <div className="space-y-2">
              <div className="h-12 w-full animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/70" />
              <div className="h-12 w-full animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/70" />
            </div>
          )}
          {ranges.map(range => (
            <div key={`${range.timeFrom}-${range.timeTo}`} className="rounded-xl border border-slate-700/70 p-3">
              <div className="text-sm text-slate-200">
                {new Date(range.timeFrom).toLocaleString()} - {new Date(range.timeTo).toLocaleString()}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(() => {
                  const rangeKey = `${range.timeFrom}-${range.timeTo}`;
                  const isDeletingPartitions = deletingRangeKey === rangeKey && deletingRangeMode === "partitions";
                  const isDeletingRange = deletingRangeKey === rangeKey && deletingRangeMode === "range";
                  const isDonePartitions = rangeDoneKey === rangeKey && rangeDoneMode === "partitions";
                  const isDoneRange = rangeDoneKey === rangeKey && rangeDoneMode === "range";
                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
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

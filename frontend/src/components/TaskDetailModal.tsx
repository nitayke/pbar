import type { TaskMetrics, TaskProgress, TaskRange, TaskStatusHistogram, TaskSummary } from "../types";
import TaskDetail from "./TaskDetail";

type Props = {
  task: TaskSummary;
  progress: TaskProgress | null;
  metrics: TaskMetrics | null;
  histogram: TaskStatusHistogram | null;
  isHistogramLoading: boolean;
  ranges: TaskRange[];
  onClose: () => void;
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

export default function TaskDetailModal({
  task,
  progress,
  metrics,
  histogram,
  isHistogramLoading,
  ranges,
  onClose,
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
  actionNote,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
    >
      <div
        className="glass flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            פרטי משימה
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
          >
            סגור
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pe-2">
          <TaskDetail
            task={task}
            progress={progress}
            metrics={metrics}
            histogram={histogram}
            isHistogramLoading={isHistogramLoading}
            ranges={ranges}
            onDeleteTask={onDeleteTask}
            onClearPartitions={onClearPartitions}
            onDeleteRange={onDeleteRange}
            onAddRange={onAddRange}
            onHistogramZoom={onHistogramZoom}
            isDeletingTask={isDeletingTask}
            isClearingPartitions={isClearingPartitions}
            deletingRangeKey={deletingRangeKey}
            deletingRangeMode={deletingRangeMode}
            rangeDoneKey={rangeDoneKey}
            rangeDoneMode={rangeDoneMode}
            actionNote={actionNote}
          />
        </div>
      </div>
    </div>
  );
}

import type { TaskSummary } from "../types";

type Props = {
  task: TaskSummary;
  selected: boolean;
  onSelect: (taskId: string) => void;
};

export default function TaskCard({ task, selected, onSelect }: Props) {
  const typeLabel =
    task.type === "reflow" ? "ריפלו" : task.type === "hermetics" ? "הרמטיות" : "אחר";

  return (
    <button
      type="button"
      onClick={() => onSelect(task.taskId)}
      className={`btn-hover w-full rounded-2xl border p-4 text-right transition ${
        selected
          ? "border-emerald-400/70 bg-emerald-500/10"
          : "border-slate-700/80 bg-slate-900/70 hover:border-slate-500"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">{task.taskId}</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {typeLabel}
          </div>
        </div>
        <div className="text-xs text-slate-400">{new Date(task.lastUpdate).toLocaleString()}</div>
      </div>
      <p className="task-description mt-2 max-h-16 overflow-y-auto pr-1 text-sm text-slate-300">{task.description || "ללא תיאור"}</p>
      <div className="mt-2 text-xs text-slate-400">נוצר על ידי: {task.createdBy || "-"}</div>
      <div className="mt-1 text-xs text-slate-400">גודל חלוקה: {task.partitionSizeSeconds ?? "-"} שניות</div>
    </button>
  );
}

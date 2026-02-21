import type { TaskSummary } from "../types";
import TaskCard from "./TaskCard";

type Props = {
  tasks: TaskSummary[];
  totalCount: number;
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
};

export default function TaskListPanel({
  tasks,
  totalCount,
  isLoading,
  selectedTaskId,
  onSelectTask,
}: Props) {
  return (
    <div className="glass relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>משימות</span>
        <span>
          {tasks.length}/{totalCount}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.taskId}
            task={task}
            selected={task.taskId === selectedTaskId}
            onSelect={onSelectTask}
          />
        ))}

        {isLoading && tasks.length === 0 && (
          <div className="space-y-3">
            <div className="h-20 w-full animate-pulse rounded-2xl border border-slate-700/70 bg-slate-900/70" />
            <div className="h-20 w-full animate-pulse rounded-2xl border border-slate-700/70 bg-slate-900/70" />
            <div className="h-20 w-full animate-pulse rounded-2xl border border-slate-700/70 bg-slate-900/70" />
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="flex h-full items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-sm">אין משימות</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

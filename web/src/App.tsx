import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { TaskCreateRequest, TaskMetrics, TaskProgress, TaskRange, TaskSummary } from "./types";
import RangeEditor, { type RangeDraft } from "./components/RangeEditor";
import TaskCard from "./components/TaskCard";
import TaskDetail from "./components/TaskDetail";

const buildRequestRanges = (ranges: RangeDraft[]): TaskRange[] =>
  ranges
    .filter(range => range.timeFrom && range.timeTo)
    .map(range => ({
      timeFrom: new Date(range.timeFrom).toISOString(),
      timeTo: new Date(range.timeTo).toISOString()
    }));

export default function App() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [pollSeconds, setPollSeconds] = useState(5);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedRanges, setSelectedRanges] = useState<TaskRange[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<TaskProgress | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<TaskMetrics | null>(null);

  const [newTaskId, setNewTaskId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCreatedBy, setNewCreatedBy] = useState("");
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [newRanges, setNewRanges] = useState<RangeDraft[]>([]);
  const [partitionMinutes, setPartitionMinutes] = useState<number>(5);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find(task => task.taskId === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks({
        type: filterType === "all" ? undefined : filterType,
        search,
        includeProgress: true,
        take: 200
      });
      setTasks(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filterType, search]);

  useEffect(() => {
    const handle = setInterval(fetchTasks, pollSeconds * 1000);
    return () => clearInterval(handle);
  }, [pollSeconds, filterType, search]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    const fetchDetail = async () => {
      try {
        const [ranges, progress, metrics] = await Promise.all([
          api.getTaskRanges(selectedTaskId),
          api.getProgress(selectedTaskId),
          api.getMetrics(selectedTaskId)
        ]);
        setSelectedRanges(ranges);
        setSelectedProgress(progress);
        setSelectedMetrics(metrics);
      } catch (error) {
        setMessage((error as Error).message);
      }
    };

    fetchDetail();
    const handle = setInterval(fetchDetail, pollSeconds * 1000);
    return () => clearInterval(handle);
  }, [selectedTaskId, pollSeconds]);

  useEffect(() => {
    if (!newCreatedBy) {
      setUserOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const users = await api.getUsers(newCreatedBy);
        setUserOptions(users);
      } catch {
        setUserOptions([]);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [newCreatedBy]);

  const onCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const payload: TaskCreateRequest = {
      taskId: newTaskId.trim(),
      description: newDescription,
      createdBy: newCreatedBy,
      ranges: buildRequestRanges(newRanges),
      partitionMinutes
    };

    try {
      await api.createTask(payload);
      setNewTaskId("");
      setNewDescription("");
      setNewCreatedBy("");
      setNewRanges([]);
      setMessage("משימה נוצרה.");
      fetchTasks();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const onDeleteTask = async () => {
    if (!selectedTaskId) {
      return;
    }
    await api.deleteTask(selectedTaskId);
    setSelectedTaskId(null);
    setSelectedRanges([]);
    fetchTasks();
  };

  const onClearPartitions = async () => {
    if (!selectedTaskId) {
      return;
    }
    await api.deletePartitions(selectedTaskId);
    fetchTasks();
  };

  const onDeleteRange = async (range: TaskRange, mode: string) => {
    if (!selectedTaskId) {
      return;
    }
    await api.deleteRange(selectedTaskId, range.timeFrom, range.timeTo, mode);
    const ranges = await api.getTaskRanges(selectedTaskId);
    setSelectedRanges(ranges);
    fetchTasks();
  };

  return (
    <div className="min-h-screen px-6 py-10 text-right text-white" dir="rtl">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.6em] text-slate-400">בקרת משימות</div>
        <h1 className="mt-2 font-display text-4xl text-white">סרגל חלוקות</h1>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <aside className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">יצירת משימה</div>
            <form className="mt-4 space-y-3" onSubmit={onCreateTask}>
              <input
                value={newTaskId}
                onChange={event => setNewTaskId(event.target.value)}
                placeholder="מזהה משימה"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                required
              />
              <input
                value={newDescription}
                onChange={event => setNewDescription(event.target.value)}
                placeholder="תיאור"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              />
              <input
                list="user-options"
                value={newCreatedBy}
                onChange={event => setNewCreatedBy(event.target.value)}
                placeholder="נוצר על ידי"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              />
              <datalist id="user-options">
                {userOptions.map(user => (
                  <option key={user} value={user} />
                ))}
              </datalist>
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">דקות חלוקה</label>
                <input
                  type="number"
                  min={1}
                  value={partitionMinutes}
                  onChange={event => setPartitionMinutes(Number(event.target.value))}
                  className="w-24 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                />
              </div>
              <RangeEditor ranges={newRanges} onChange={setNewRanges} />
              <button
                type="submit"
                className="w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
              >
                צור משימה
              </button>
            </form>
            {message && <div className="mt-3 text-xs text-amber-200">{message}</div>}
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">סינון</div>
            <div className="mt-4 space-y-3">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="חיפוש לפי מזהה"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "הכל" },
                  { value: "reflow", label: "ריפלו" },
                  { value: "hermetics", label: "הרמטיקס" },
                  { value: "other", label: "אחר" }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFilterType(type.value)}
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      filterType === type.value
                        ? "bg-white text-slate-900"
                        : "border border-slate-600 text-slate-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">רענון (ש')</label>
                <input
                  type="number"
                  min={2}
                  value={pollSeconds}
                  onChange={event => setPollSeconds(Number(event.target.value))}
                  className="w-24 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard
                key={task.taskId}
                task={task}
                selected={task.taskId === selectedTaskId}
                onSelect={setSelectedTaskId}
              />
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          <TaskDetail
            task={selectedTask}
            progress={selectedProgress}
            metrics={selectedMetrics}
            ranges={selectedRanges}
            onDeleteTask={onDeleteTask}
            onClearPartitions={onClearPartitions}
            onDeleteRange={onDeleteRange}
          />
        </main>
      </div>
    </div>
  );
}

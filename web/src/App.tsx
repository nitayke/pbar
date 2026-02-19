import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import type {
  TaskCreateRequest,
  TaskProgress,
  TaskRange,
  TaskStatusHistogram,
  TaskSummary
} from "./types";
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

const parseTaskMeta = (taskId: string) => {
  const [leftSide, targetSide] = taskId.split("-to-");
  const leftParts = (leftSide ?? "").split("-").filter(Boolean);

  return {
    processType: leftParts[0],
    materialType: leftParts[1],
    sourceSystem: leftParts.slice(2).join("-") || undefined,
    targetSystem: targetSide || undefined
  };
};

type FilterDropdownProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allOptions = ["all", ...options.filter(option => option !== "all")];
  const getOptionLabel = (option: string) => (option === "all" ? "הכל" : option);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className="btn-hover flex w-full items-center justify-between rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
      >
        <span>{getOptionLabel(value)}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-600 bg-slate-950/95 p-1 shadow-lg shadow-slate-950/50">
          {allOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`btn-hover mb-1 w-full rounded-lg px-3 py-2 text-right text-sm transition last:mb-0 ${
                value === option
                  ? "bg-cyan-500/20 text-cyan-100"
                  : "text-slate-200 hover:bg-slate-800/80"
              }`}
            >
              {getOptionLabel(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pollSeconds, setPollSeconds] = useState(5);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedRanges, setSelectedRanges] = useState<TaskRange[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<TaskProgress | null>(null);
  const [selectedHistogram, setSelectedHistogram] = useState<TaskStatusHistogram | null>(null);

  const [newTaskId, setNewTaskId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCreatedBy, setNewCreatedBy] = useState("");
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [newRanges, setNewRanges] = useState<RangeDraft[]>([]);
  const [partitionSizeSeconds, setPartitionSizeSeconds] = useState<number>(300);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isClearingPartitions, setIsClearingPartitions] = useState(false);
  const [deletingRangeKey, setDeletingRangeKey] = useState<string | null>(null);
  const [deletingRangeMode, setDeletingRangeMode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find(task => task.taskId === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const taskMetas = useMemo(
    () =>
      tasks.map(task => ({
        task,
        meta: parseTaskMeta(task.taskId)
      })),
    [tasks]
  );

  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(taskMetas.map(({ meta }) => meta.materialType).filter((value): value is string => Boolean(value)))
      ).sort(),
    [taskMetas]
  );

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(taskMetas.map(({ meta }) => meta.sourceSystem).filter((value): value is string => Boolean(value)))
      ).sort(),
    [taskMetas]
  );

  const targetOptions = useMemo(
    () =>
      Array.from(
        new Set(taskMetas.map(({ meta }) => meta.targetSystem).filter((value): value is string => Boolean(value)))
      ).sort(),
    [taskMetas]
  );

  const filteredTasks = useMemo(
    () =>
      taskMetas
        .filter(({ meta }) => {
          if (materialFilter !== "all" && meta.materialType !== materialFilter) {
            return false;
          }
          if (sourceFilter !== "all" && meta.sourceSystem !== sourceFilter) {
            return false;
          }
          if (targetFilter !== "all" && meta.targetSystem !== targetFilter) {
            return false;
          }
          return true;
        })
        .map(({ task }) => task),
    [taskMetas, materialFilter, sourceFilter, targetFilter]
  );

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks({
        type: filterType === "all" ? undefined : filterType,
        search,
        includeProgress: false,
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
      setSelectedHistogram(null);
      setIsDetailOpen(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        const [ranges, progress, histogram] = await Promise.all([
          api.getTaskRanges(selectedTaskId),
          api.getProgress(selectedTaskId),
          api.getStatusHistogram(selectedTaskId, selectedTask?.partitionSizeSeconds)
        ]);
        setSelectedRanges(ranges);
        setSelectedProgress(progress);
        setSelectedHistogram(histogram);
      } catch (error) {
        setMessage((error as Error).message);
      }
    };

    fetchDetail();
    const handle = setInterval(fetchDetail, pollSeconds * 1000);
    return () => clearInterval(handle);
  }, [selectedTaskId, pollSeconds, selectedTask?.partitionSizeSeconds]);

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
    setIsCreatingTask(true);

    const payload: TaskCreateRequest = {
      taskId: newTaskId.trim(),
      description: newDescription,
      createdBy: newCreatedBy,
      ranges: buildRequestRanges(newRanges),
      partitionSizeSeconds
    };

    try {
      await api.createTask(payload);
      setNewTaskId("");
      setNewDescription("");
      setNewCreatedBy("");
      setNewRanges([]);
      setIsCreateOpen(false);
      setMessage("משימה נוצרה.");
      fetchTasks();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const onDeleteTask = async () => {
    if (!selectedTaskId) {
      return;
    }
    setIsDeletingTask(true);
    try {
      await api.deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      setSelectedRanges([]);
      setSelectedHistogram(null);
      setIsDetailOpen(false);
      fetchTasks();
    } finally {
      setIsDeletingTask(false);
    }
  };

  const onOpenDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailOpen(true);
  };

  const onCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedTaskId(null);
    setSelectedRanges([]);
    setSelectedHistogram(null);
  };

  const onClearPartitions = async () => {
    if (!selectedTaskId) {
      return;
    }
    setIsClearingPartitions(true);
    try {
      await api.deletePartitions(selectedTaskId);
      fetchTasks();
    } finally {
      setIsClearingPartitions(false);
    }
  };

  const onDeleteRange = async (range: TaskRange, mode: string) => {
    if (!selectedTaskId) {
      return;
    }
    const rangeKey = `${range.timeFrom}-${range.timeTo}`;
    setDeletingRangeKey(rangeKey);
    setDeletingRangeMode(mode);
    try {
      await api.deleteRange(selectedTaskId, range.timeFrom, range.timeTo, mode);
      const ranges = await api.getTaskRanges(selectedTaskId);
      setSelectedRanges(ranges);
      fetchTasks();
    } finally {
      setDeletingRangeKey(null);
      setDeletingRangeMode(null);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden px-6 py-6 text-right text-white" dir="rtl">
      <div className="relative z-10">
        <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.6em] text-slate-400">בקרת משימות</div>
          <h1 className="mt-2 font-display text-4xl text-white">סרגל פרטישנים</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setIsCreateOpen(true);
          }}
          className="btn-hover rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
        >
          יצירת משימה
        </button>
        </header>

        <div className="grid h-[calc(100vh-124px)] gap-4 lg:grid-cols-[360px,1fr]">
          <div className="glass relative z-20 rounded-3xl p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">סינון</div>
            <div className="mt-3 space-y-2">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="חיפוש לפי מזהה"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "הכל" },
                  { value: "reflow", label: "ריפלו" },
                  { value: "hermetics", label: "הרמטיות" },
                  { value: "other", label: "אחר" }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFilterType(type.value)}
                    className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
                      filterType === type.value
                        ? "bg-white text-slate-900"
                        : "btn-hover border border-slate-600 text-slate-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <FilterDropdown
                  label="סוג חומר"
                  value={materialFilter}
                  options={materialOptions}
                  onChange={setMaterialFilter}
                />

                <FilterDropdown
                  label="מקור מידע"
                  value={sourceFilter}
                  options={sourceOptions}
                  onChange={setSourceFilter}
                />

                <FilterDropdown
                  label="יעד מידע"
                  value={targetFilter}
                  options={targetOptions}
                  onChange={setTargetFilter}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">רענון (ש')</label>
                <input
                  type="number"
                  min={2}
                  value={pollSeconds}
                  onChange={event => setPollSeconds(Number(event.target.value))}
                  className="w-20 rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm"
                />
              </div>
            </div>
            {message && <div className="mt-3 text-xs text-amber-200">{message}</div>}
          </div>
          <div className="glass relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>משימות</span>
              <span>{filteredTasks.length}/{tasks.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-2">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  selected={task.taskId === selectedTaskId}
                  onSelect={onOpenDetail}
                />
              ))}
              {filteredTasks.length === 0 && (
                <div className="rounded-xl border border-slate-700/70 p-4 text-sm text-slate-300">
                  אין משימות שמתאימות לפילטרים שנבחרו.
                </div>
              )}
            </div>
          </div>
      </div>

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">יצירת משימה</div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
              >
                סגור
              </button>
            </div>

            <form className="space-y-3" onSubmit={onCreateTask}>
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
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">שניות חלוקה</label>
                <input
                  type="number"
                  min={1}
                  value={partitionSizeSeconds}
                  onChange={event => setPartitionSizeSeconds(Number(event.target.value))}
                  className="w-24 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
                />
              </div>
              <RangeEditor ranges={newRanges} onChange={setNewRanges} />
              <button
                type="submit"
                disabled={isCreatingTask}
                className="btn-hover w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
              >
                {isCreatingTask ? "יוצר..." : "צור משימה"}
              </button>
            </form>
            {message && <div className="mt-3 text-xs text-amber-200">{message}</div>}
          </div>
        )}

        {isDetailOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
            <div className="glass max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">פרטי משימה</div>
                <button
                  type="button"
                  onClick={onCloseDetail}
                  className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
                >
                  סגור
                </button>
              </div>
              <TaskDetail
                task={selectedTask}
                progress={selectedProgress}
                histogram={selectedHistogram}
                ranges={selectedRanges}
                onDeleteTask={onDeleteTask}
                onClearPartitions={onClearPartitions}
                onDeleteRange={onDeleteRange}
                isDeletingTask={isDeletingTask}
                isClearingPartitions={isClearingPartitions}
                deletingRangeKey={deletingRangeKey}
                deletingRangeMode={deletingRangeMode}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

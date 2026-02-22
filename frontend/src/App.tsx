import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  TaskMetrics,
  TaskProgress,
  TaskRange,
  TaskStatusHistogram,
  TaskSummary,
} from "./types";
import { parseTaskMeta } from "./lib/taskUtils";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { useMessage } from "./hooks/useMessage";
import { useEscapeKey } from "./hooks/useEscapeKey";

import WelcomeScreen from "./components/WelcomeScreen";
import FilterSidebar from "./components/FilterSidebar";
import TaskListPanel from "./components/TaskListPanel";
import CreateTaskModal from "./components/CreateTaskModal";
import TaskDetailModal from "./components/TaskDetailModal";
import AddRangeModal from "./components/AddRangeModal";

export default function App() {
  /* ── user ─────────────────────────────────────────────── */
  const { currentUserName, nameInput, setNameInput, saveUserName } =
    useCurrentUser();
  const { message, showMessage, clearMessage } = useMessage();

  const onSaveUserName = () => {
    if (!saveUserName(nameInput)) {
      showMessage("יש להזין שם משתמש כדי להמשיך.");
    } else {
      clearMessage();
    }
  };

  /* ── filters ──────────────────────────────────────────── */
  const [filterType, setFilterType] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [pollSeconds, setPollSeconds] = useState(5);

  const hasActiveFilters =
    filterType !== "all" ||
    materialFilter !== "all" ||
    sourceFilter !== "all" ||
    targetFilter !== "all" ||
    myTasksOnly ||
    !!search;

  const resetAllFilters = () => {
    setFilterType("all");
    setMaterialFilter("all");
    setSourceFilter("all");
    setTargetFilter("all");
    setMyTasksOnly(false);
    setSearch("");
  };

  /* ── tasks ────────────────────────────────────────────── */
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      if (!currentUserName) {
        setTasks([]);
        return;
      }
      const data = await api.getTasks({
        type: filterType === "all" ? undefined : filterType,
        search,
        createdBy: myTasksOnly ? currentUserName : undefined,
        includeProgress: true,
        take: 200,
      });
      setTasks(data);
    } catch (error) {
      showMessage((error as Error).message);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [filterType, search, myTasksOnly, currentUserName, showMessage]);

  useEffect(() => {
    setIsLoadingTasks(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handle = setInterval(fetchTasks, pollSeconds * 1000);
    return () => clearInterval(handle);
  }, [pollSeconds, fetchTasks]);

  /* ── derived filter options ───────────────────────────── */
  const taskMetas = useMemo(
    () => tasks.map((t) => ({ task: t, meta: parseTaskMeta(t.taskId) })),
    [tasks]
  );

  const unique = <T,>(arr: (T | undefined)[]) =>
    Array.from(new Set(arr.filter((v): v is T => Boolean(v)))).sort() as T[];

  const materialOptions = useMemo(
    () => unique(taskMetas.map(({ meta }) => meta.materialType)),
    [taskMetas]
  );
  const sourceOptions = useMemo(
    () => unique(taskMetas.map(({ meta }) => meta.sourceSystem)),
    [taskMetas]
  );
  const targetOptions = useMemo(
    () => unique(taskMetas.map(({ meta }) => meta.targetSystem)),
    [taskMetas]
  );

  const filteredTasks = useMemo(
    () =>
      taskMetas
        .filter(({ meta }) => {
          if (materialFilter !== "all" && meta.materialType !== materialFilter) return false;
          if (sourceFilter !== "all" && meta.sourceSystem !== sourceFilter) return false;
          if (targetFilter !== "all" && meta.targetSystem !== targetFilter) return false;
          return true;
        })
        .map(({ task }) => task),
    [taskMetas, materialFilter, sourceFilter, targetFilter]
  );

  /* ── detail modal state ──────────────────────────────── */
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedRanges, setSelectedRanges] = useState<TaskRange[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<TaskProgress | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<TaskMetrics | null>(null);
  const [selectedHistogram, setSelectedHistogram] = useState<TaskStatusHistogram | null>(null);
  const [isHistogramLoading, setIsHistogramLoading] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isClearingPartitions, setIsClearingPartitions] = useState(false);
  const [deletingRangeKey, setDeletingRangeKey] = useState<string | null>(null);
  const [deletingRangeMode, setDeletingRangeMode] = useState<string | null>(null);
  const [rangeDoneKey, setRangeDoneKey] = useState<string | null>(null);
  const [rangeDoneMode, setRangeDoneMode] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.taskId === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  /* ── modal toggles ───────────────────────────────────── */
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddRangeOpen, setIsAddRangeOpen] = useState(false);

  const onOpenDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailOpen(true);
  };

  const onCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedTaskId(null);
    setSelectedRanges([]);
    setSelectedMetrics(null);
    setSelectedHistogram(null);
  }, []);

  useEscapeKey(isCreateOpen, () => setIsCreateOpen(false));
  useEscapeKey(isDetailOpen, onCloseDetail);

  /* ── detail fetch ─────────────────────────────────────── */
  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedHistogram(null);
      setSelectedMetrics(null);
      setIsHistogramLoading(false);
      setIsDetailOpen(false);
      return;
    }
    (async () => {
      setIsHistogramLoading(true);
      try {
        const [ranges, progress, metrics, histogram] = await Promise.all([
          api.getTaskRanges(selectedTaskId),
          api.getProgress(selectedTaskId),
          api.getMetrics(selectedTaskId),
          api.getStatusHistogram(selectedTaskId, selectedTask?.partitionSizeSeconds),
        ]);
        setSelectedRanges(ranges);
        setSelectedProgress(progress);
        setSelectedMetrics(metrics);
        setSelectedHistogram(histogram);
      } catch (error) {
        showMessage((error as Error).message);
      } finally {
        setIsHistogramLoading(false);
      }
    })();
  }, [selectedTaskId, selectedTask?.partitionSizeSeconds, showMessage]);

  useEffect(() => {
    if (!selectedTaskId || !isDetailOpen) {
      return;
    }

    const refreshLiveMetrics = async () => {
      try {
        const [progress, metrics] = await Promise.all([
          api.getProgress(selectedTaskId),
          api.getMetrics(selectedTaskId),
        ]);
        setSelectedProgress(progress);
        setSelectedMetrics(metrics);
      } catch (error) {
        showMessage((error as Error).message);
      }
    };

    const handle = setInterval(refreshLiveMetrics, pollSeconds * 1000);
    return () => clearInterval(handle);
  }, [selectedTaskId, isDetailOpen, pollSeconds, showMessage]);

  /* ── detail actions ───────────────────────────────────── */
  const onDeleteTask = async () => {
    if (!selectedTaskId) return;
    setIsDeletingTask(true);
    try {
      await api.deleteTask(selectedTaskId);
      showMessage("משימה נמחקה.", 3000);
      onCloseDetail();
      fetchTasks();
    } finally {
      setIsDeletingTask(false);
    }
  };

  const onClearPartitions = async () => {
    if (!selectedTaskId) return;
    setIsClearingPartitions(true);
    try {
      await api.deletePartitions(selectedTaskId);
      setActionNote("פרטישנים נוקו.");
      setTimeout(() => setActionNote(null), 1800);
      fetchTasks();
    } finally {
      setIsClearingPartitions(false);
    }
  };

  const onDeleteRange = async (range: TaskRange, mode: string) => {
    if (!selectedTaskId) return;
    const rangeKey = `${range.timeFrom}-${range.timeTo}`;
    setDeletingRangeKey(rangeKey);
    setDeletingRangeMode(mode);
    try {
      await api.deleteRange(selectedTaskId, range.timeFrom, range.timeTo, mode);
      const ranges = await api.getTaskRanges(selectedTaskId);
      setSelectedRanges(ranges);
      setRangeDoneKey(rangeKey);
      setRangeDoneMode(mode);
      setActionNote(mode === "partitions" ? "פרטישנים נמחקו." : "טווח נמחק.");
      setTimeout(() => {
        setRangeDoneKey(null);
        setRangeDoneMode(null);
        setActionNote(null);
      }, 1800);
      fetchTasks();
    } finally {
      setDeletingRangeKey(null);
      setDeletingRangeMode(null);
    }
  };

  const onAddRangeSubmit = async (range: TaskRange) => {
    if (!selectedTaskId) return;
    await api.addTaskRange(selectedTaskId, range);
    const ranges = await api.getTaskRanges(selectedTaskId);
    setSelectedRanges(ranges);
    setActionNote("טווח נוסף.");
    setTimeout(() => setActionNote(null), 1800);
    fetchTasks();
  };

  const onHistogramZoom = async (from: Date, to: Date) => {
    if (!selectedTaskId) return;
    setIsHistogramLoading(true);
    try {
      const histogram = await api.getStatusHistogram(selectedTaskId, undefined, from, to);
      setSelectedHistogram(histogram);
    } catch (error) {
      showMessage((error as Error).message);
    } finally {
      setIsHistogramLoading(false);
    }
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="relative h-screen overflow-hidden px-6 py-6 text-right text-white" dir="rtl">
      <div className="relative z-10">
        {/* Header */}
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.6em] text-slate-400">בקרת משימות</div>
            <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[0.08em] text-white">
              PBAR 2.0
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              clearMessage();
              setIsCreateOpen(true);
            }}
            className="btn-hover rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
          >
            יצירת משימה
          </button>
        </header>

        {/* Main grid */}
        <div className="grid h-[calc(100vh-124px)] gap-4 lg:grid-cols-[360px,1fr]">
          <FilterSidebar
            search={search}
            onSearchChange={setSearch}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            myTasksOnly={myTasksOnly}
            onMyTasksOnlyChange={setMyTasksOnly}
            materialFilter={materialFilter}
            onMaterialFilterChange={setMaterialFilter}
            materialOptions={materialOptions}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            sourceOptions={sourceOptions}
            targetFilter={targetFilter}
            onTargetFilterChange={setTargetFilter}
            targetOptions={targetOptions}
            pollSeconds={pollSeconds}
            onPollSecondsChange={setPollSeconds}
            onResetAll={resetAllFilters}
            hasActiveFilters={hasActiveFilters}
            message={message}
          />

          <TaskListPanel
            tasks={filteredTasks}
            totalCount={tasks.length}
            isLoading={isLoadingTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={onOpenDetail}
          />
        </div>

        {/* Modals */}
        {isCreateOpen && (
          <CreateTaskModal
            onClose={() => setIsCreateOpen(false)}
            onCreated={fetchTasks}
            showMessage={showMessage}
            currentUserName={currentUserName}
            createTask={api.createTask}
          />
        )}

        {isDetailOpen && selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            progress={selectedProgress}
            metrics={selectedMetrics}
            histogram={selectedHistogram}
            isHistogramLoading={isHistogramLoading}
            ranges={selectedRanges}
            onClose={onCloseDetail}
            onDeleteTask={onDeleteTask}
            onClearPartitions={onClearPartitions}
            onDeleteRange={onDeleteRange}
            onAddRange={() => setIsAddRangeOpen(true)}
            onHistogramZoom={onHistogramZoom}
            isDeletingTask={isDeletingTask}
            isClearingPartitions={isClearingPartitions}
            deletingRangeKey={deletingRangeKey}
            deletingRangeMode={deletingRangeMode}
            rangeDoneKey={rangeDoneKey}
            rangeDoneMode={rangeDoneMode}
            actionNote={actionNote}
          />
        )}

        {isAddRangeOpen && (
          <AddRangeModal
            onClose={() => setIsAddRangeOpen(false)}
            onSubmit={onAddRangeSubmit}
            currentUserName={currentUserName}
            partitionSizeSeconds={selectedTask?.partitionSizeSeconds}
            showMessage={showMessage}
          />
        )}
      </div>

      {/* Welcome overlay */}
      {!currentUserName && (
        <WelcomeScreen
          nameInput={nameInput}
          onNameInputChange={setNameInput}
          onSubmit={onSaveUserName}
          message={message}
        />
      )}
    </div>
  );
}

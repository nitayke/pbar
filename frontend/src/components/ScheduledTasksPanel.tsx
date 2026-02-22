import { useState, useEffect, useRef } from "react";
import type { ScheduledTask, ScheduledTaskCreateRequest, ScheduledTaskUpdateRequest, TaskSummary } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  tasks: TaskSummary[];
  currentUserName: string;
  showMessage: (text: string, autoDismissMs?: number) => void;
  getScheduledTasks: () => Promise<ScheduledTask[]>;
  createScheduledTask: (req: ScheduledTaskCreateRequest) => Promise<ScheduledTask>;
  updateScheduledTask: (scheduleId: string, req: ScheduledTaskUpdateRequest) => Promise<ScheduledTask>;
  deleteScheduledTask: (scheduleId: string) => Promise<void>;
};

const INTERVAL_OPTIONS = [
  { label: "כל 15 דקות", value: 900 },
  { label: "כל 30 דקות", value: 1800 },
  { label: "כל שעה", value: 3600 },
  { label: "כל שעתיים", value: 7200 },
  { label: "כל 4 שעות", value: 14400 },
  { label: "כל 8 שעות", value: 28800 },
  { label: "כל 12 שעות", value: 43200 },
  { label: "כל 24 שעות", value: 86400 },
];

const BULK_OPTIONS = [
  { label: "15 דקות", value: 900 },
  { label: "30 דקות", value: 1800 },
  { label: "שעה", value: 3600 },
  { label: "שעתיים", value: 7200 },
  { label: "4 שעות", value: 14400 },
  { label: "8 שעות", value: 28800 },
  { label: "12 שעות", value: 43200 },
  { label: "24 שעות", value: 86400 },
];

const formatInterval = (seconds: number) => {
  const opt = INTERVAL_OPTIONS.find((o) => o.value === seconds);
  if (opt) return opt.label;
  if (seconds < 3600) return `${Math.round(seconds / 60)} דק׳`;
  return `${Math.round(seconds / 3600)} שעות`;
};

const formatBulk = (seconds: number) => {
  const opt = BULK_OPTIONS.find((o) => o.value === seconds);
  if (opt) return opt.label;
  if (seconds < 3600) return `${Math.round(seconds / 60)} דק׳`;
  return `${Math.round(seconds / 3600)} שעות`;
};

const formatDatetime = (iso: string | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ScheduledTasksPanel({
  visible,
  onClose,
  tasks,
  currentUserName,
  showMessage,
  getScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
}: Props) {
  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(3600);
  const [bulkSizeSeconds, setBulkSizeSeconds] = useState(3600);
  const [isCreating, setIsCreating] = useState(false);

  // Dropdown open states
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);
  const taskDropdownRef = useRef<HTMLDivElement>(null);
  const intervalDropdownRef = useRef<HTMLDivElement>(null);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target as Node)) {
        setTaskDropdownOpen(false);
      }
      if (intervalDropdownRef.current && !intervalDropdownRef.current.contains(event.target as Node)) {
        setIntervalDropdownOpen(false);
      }
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target as Node)) {
        setBulkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await getScheduledTasks();
      setSchedules(data);
    } catch (error) {
      showMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSchedules();
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!selectedTaskId) {
      showMessage("יש לבחור משימה");
      return;
    }
    if (!currentUserName.trim()) {
      showMessage("יש להזין שם משתמש");
      return;
    }

    setIsCreating(true);
    try {
      await createScheduledTask({
        taskId: selectedTaskId,
        intervalSeconds,
        bulkSizeSeconds,
        createdBy: currentUserName.trim(),
      });
      showMessage("תזמון נוצר", 3000);
      setShowCreate(false);
      setSelectedTaskId("");
      await fetchSchedules();
    } catch (error) {
      showMessage((error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnabled = async (schedule: ScheduledTask) => {
    try {
      await updateScheduledTask(schedule.scheduleId, {
        isEnabled: !schedule.isEnabled,
      });
      await fetchSchedules();
    } catch (error) {
      showMessage((error as Error).message);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await deleteScheduledTask(scheduleId);
      showMessage("תזמון נמחק", 3000);
      await fetchSchedules();
    } catch (error) {
      showMessage((error as Error).message);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            משימות מתוזמנות
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="btn-hover rounded-lg border border-indigo-500 bg-indigo-500/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-300 transition"
            >
              {showCreate ? "בטל" : "צור חדש"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
            >
              סגור
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-4 space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              יצירת תזמון חדש
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Task dropdown */}
              <div ref={taskDropdownRef} className="relative">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                  משימה
                </label>
                <button
                  type="button"
                  onClick={() => setTaskDropdownOpen((prev) => !prev)}
                  className="btn-hover flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <span className="truncate">{selectedTaskId || "בחר משימה..."}</span>
                  <span className="text-slate-400">▾</span>
                </button>
                {taskDropdownOpen && (
                  <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-950/95 p-1 shadow-lg shadow-slate-950/50">
                    {tasks.map((t) => (
                      <button
                        key={t.taskId}
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(t.taskId);
                          setTaskDropdownOpen(false);
                        }}
                        className={`btn-hover mb-1 w-full rounded-lg px-3 py-2 text-right text-sm transition last:mb-0 ${
                          selectedTaskId === t.taskId
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "text-slate-200 hover:bg-slate-800/80"
                        }`}
                      >
                        {t.taskId}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Interval dropdown */}
              <div ref={intervalDropdownRef} className="relative">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                  תדירות
                </label>
                <button
                  type="button"
                  onClick={() => setIntervalDropdownOpen((prev) => !prev)}
                  className="btn-hover flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <span>{INTERVAL_OPTIONS.find((o) => o.value === intervalSeconds)?.label}</span>
                  <span className="text-slate-400">▾</span>
                </button>
                {intervalDropdownOpen && (
                  <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-950/95 p-1 shadow-lg shadow-slate-950/50">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setIntervalSeconds(opt.value);
                          setIntervalDropdownOpen(false);
                        }}
                        className={`btn-hover mb-1 w-full rounded-lg px-3 py-2 text-right text-sm transition last:mb-0 ${
                          intervalSeconds === opt.value
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "text-slate-200 hover:bg-slate-800/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bulk size dropdown */}
              <div ref={bulkDropdownRef} className="relative">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                  גודל
                </label>
                <button
                  type="button"
                  onClick={() => setBulkDropdownOpen((prev) => !prev)}
                  className="btn-hover flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <span>{BULK_OPTIONS.find((o) => o.value === bulkSizeSeconds)?.label}</span>
                  <span className="text-slate-400">▾</span>
                </button>
                {bulkDropdownOpen && (
                  <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-950/95 p-1 shadow-lg shadow-slate-950/50">
                    {BULK_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setBulkSizeSeconds(opt.value);
                          setBulkDropdownOpen(false);
                        }}
                        className={`btn-hover mb-1 w-full rounded-lg px-3 py-2 text-right text-sm transition last:mb-0 ${
                          bulkSizeSeconds === opt.value
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "text-slate-200 hover:bg-slate-800/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating || !selectedTaskId}
              className="rounded-xl border border-indigo-500 bg-indigo-500/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-indigo-300 transition hover:bg-indigo-500/40 disabled:opacity-50"
            >
              {isCreating ? "יוצר..." : "צור תזמון"}
            </button>
          </div>
        )}

        {/* Schedules list */}
        {loading ? (
          <div className="text-center text-slate-400">טוען...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center text-slate-500">אין משימות מתוזמנות</div>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.scheduleId}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                  schedule.isEnabled
                    ? "border-green-600/40 bg-green-900/10"
                    : "border-slate-700 bg-slate-800/30"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-slate-200">
                    {schedule.taskId}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>תדירות: {formatInterval(schedule.intervalSeconds)}</span>
                    <span>גודל: {formatBulk(schedule.bulkSizeSeconds)}</span>
                    <span>ביצוע אחרון: {formatDatetime(schedule.lastExecutionTime)}</span>
                    <span>הבא: {formatDatetime(schedule.nextExecutionTime)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    נוצר ע״י: {schedule.createdBy} • {formatDatetime(schedule.createdAt)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(schedule)}
                    className={`rounded-lg px-3 py-1 text-xs uppercase tracking-[0.15em] transition ${
                      schedule.isEnabled
                        ? "border border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
                        : "border border-green-500 text-green-400 hover:bg-green-500/20"
                    }`}
                  >
                    {schedule.isEnabled ? "השהה" : "הפעל"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(schedule.scheduleId)}
                    className="rounded-lg border border-red-500 px-3 py-1 text-xs uppercase tracking-[0.15em] text-red-400 transition hover:bg-red-500/20"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

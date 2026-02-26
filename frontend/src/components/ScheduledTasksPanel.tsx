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

type DhmsFields = { days: number; hours: number; minutes: number; seconds: number };

const dhmsToSeconds = (f: DhmsFields) =>
  f.days * 86400 + f.hours * 3600 + f.minutes * 60 + f.seconds;

const secondsToDhms = (totalSeconds: number): DhmsFields => {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

const formatDuration = (totalSeconds: number) => {
  const { days, hours, minutes, seconds } = secondsToDhms(totalSeconds);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
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
  const [intervalDhms, setIntervalDhms] = useState<DhmsFields>({ days: 0, hours: 1, minutes: 0, seconds: 0 });
  const [bulkDhms, setBulkDhms] = useState<DhmsFields>({ days: 0, hours: 1, minutes: 0, seconds: 0 });
  const [firstExecTime, setFirstExecTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Dropdown open state (only task picker)
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const taskDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(event.target as Node)) {
        setTaskDropdownOpen(false);
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
    const intervalSeconds = dhmsToSeconds(intervalDhms);
    const bulkSizeSeconds = dhmsToSeconds(bulkDhms);
    if (intervalSeconds <= 0) {
      showMessage("תדירות חייבת להיות גדולה מ-0");
      return;
    }
    if (bulkSizeSeconds <= 0) {
      showMessage("גודל חייב להיות גדול מ-0");
      return;
    }

    setIsCreating(true);
    try {
      const req: ScheduledTaskCreateRequest = {
        taskId: selectedTaskId,
        intervalSeconds,
        bulkSizeSeconds,
        createdBy: currentUserName.trim(),
      };
      if (firstExecTime) {
        req.firstExecutionTime = new Date(firstExecTime).toISOString();
      }
      await createScheduledTask(req);
      showMessage("תזמון נוצר", 3000);
      setShowCreate(false);
      setSelectedTaskId("");
      setFirstExecTime("");
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
            <div className="text-xs text-amber-400/80">
              * ניתן לתזמן רק משימה שכבר נוצרה במערכת
            </div>

            <div className="space-y-3">
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

              {/* Interval – D / H / M / S */}
              <DhmsInput label="תדירות" value={intervalDhms} onChange={setIntervalDhms} />

              {/* Bulk size – D / H / M / S */}
              <DhmsInput label="גודל טווח" value={bulkDhms} onChange={setBulkDhms} />

              {/* First execution time */}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                  זמן ריצה ראשון (אופציונלי)
                </label>
                <input
                  type="datetime-local"
                  value={firstExecTime}
                  onChange={(e) => setFirstExecTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 [color-scheme:dark]"
                />
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
                    <span>תדירות: {formatDuration(schedule.intervalSeconds)}</span>
                    <span>גודל טווח: {formatDuration(schedule.bulkSizeSeconds)}</span>
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

/* ────────── D / H / M / S input group ────────── */
function DhmsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DhmsFields;
  onChange: (v: DhmsFields) => void;
}) {
  const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.floor(n) || 0));

  const update = (field: keyof DhmsFields, raw: string) => {
    const n = parseInt(raw, 10) || 0;
    const limits: Record<keyof DhmsFields, number> = { days: 365, hours: 23, minutes: 59, seconds: 59 };
    onChange({ ...value, [field]: clamp(n, limits[field]) });
  };

  const inputCls =
    "w-14 rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1.5 text-center text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-0.5">
          <input type="number" min={0} max={365} value={value.days} onChange={(e) => update("days", e.target.value)} className={inputCls} />
          <span className="text-[10px] text-slate-500">ימים</span>
        </div>
        <span className="text-slate-500">:</span>
        <div className="flex flex-col items-center gap-0.5">
          <input type="number" min={0} max={23} value={value.hours} onChange={(e) => update("hours", e.target.value)} className={inputCls} />
          <span className="text-[10px] text-slate-500">שעות</span>
        </div>
        <span className="text-slate-500">:</span>
        <div className="flex flex-col items-center gap-0.5">
          <input type="number" min={0} max={59} value={value.minutes} onChange={(e) => update("minutes", e.target.value)} className={inputCls} />
          <span className="text-[10px] text-slate-500">דקות</span>
        </div>
        <span className="text-slate-500">:</span>
        <div className="flex flex-col items-center gap-0.5">
          <input type="number" min={0} max={59} value={value.seconds} onChange={(e) => update("seconds", e.target.value)} className={inputCls} />
          <span className="text-[10px] text-slate-500">שניות</span>
        </div>
      </div>
    </div>
  );
}

import type { FormEvent } from "react";
import type { TaskCreateRequest } from "../types";
import type { RangeDraft } from "./RangeEditor";
import RangeEditor from "./RangeEditor";
import { buildRequestRanges } from "../lib/taskUtils";

type Props = {
  onClose: () => void;
  onCreated: () => void;
  showMessage: (text: string, autoDismissMs?: number) => void;
  currentUserName: string;
  createTask: (payload: TaskCreateRequest) => Promise<unknown>;
};

import { useState } from "react";

type SizeUnit = "seconds" | "minutes" | "hours";
const UNIT_LABELS: Record<SizeUnit, string> = { seconds: "שניות", minutes: "דקות", hours: "שעות" };
const UNIT_MULTIPLIER: Record<SizeUnit, number> = { seconds: 1, minutes: 60, hours: 3600 };
const UNIT_STEP: Record<SizeUnit, number> = { seconds: 10, minutes: 1, hours: 1 };

export default function CreateTaskModal({
  onClose,
  onCreated,
  showMessage,
  currentUserName,
  createTask,
}: Props) {
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [ranges, setRanges] = useState<RangeDraft[]>([]);
  const [sizeValue, setSizeValue] = useState(5);
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>("minutes");
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const partitionSizeSeconds = sizeValue * UNIT_MULTIPLIER[sizeUnit];

  const taskIdPattern = /^[A-Za-z0-9-]+$/;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatusMsg(null);

    if (!currentUserName.trim()) {
      setStatusMsg({ text: "יש להזין שם משתמש לפני יצירת משימה.", type: "error" });
      return;
    }

    const normalizedTaskId = taskId.trim();
    if (!taskIdPattern.test(normalizedTaskId)) {
      setStatusMsg({ text: "מזהה משימה יכול להכיל רק אותיות באנגלית, מספרים ומקף (-).", type: "error" });
      return;
    }

    if (partitionSizeSeconds <= 0) {
      setStatusMsg({ text: "גודל חלוקה חייב להיות חיובי.", type: "error" });
      return;
    }

    const invalidRange = ranges.find(
      (r) => r.timeFrom && r.timeTo && new Date(r.timeTo) <= new Date(r.timeFrom)
    );
    if (invalidRange) {
      setStatusMsg({ text: "זמן הסיום חייב להיות אחרי זמן ההתחלה בכל הטווחים", type: "error" });
      return;
    }

    setIsCreating(true);
    setStatusMsg({ text: "יוצר משימה ופרטישנים... זה עלול לקחת זמן עבור טווחים גדולים.", type: "success" });

    const payload: TaskCreateRequest = {
      taskId: normalizedTaskId,
      description,
      ranges: buildRequestRanges(ranges, currentUserName),
      partitionSizeSeconds,
    };

    try {
      await createTask(payload);
      setStatusMsg({ text: "משימה נוצרה בהצלחה!", type: "success" });
      onCreated();
      setTimeout(onClose, 1200);
    } catch (error) {
      setStatusMsg({ text: (error as Error).message, type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            יצירת משימה
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
          >
            סגור
          </button>
        </div>

        {/* Status banner */}
        {statusMsg && (
          <div
            className={`mb-3 rounded-xl px-4 py-2.5 text-sm ${
              statusMsg.type === "error"
                ? "border border-red-500/50 bg-red-500/10 text-red-300"
                : "border border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="מזהה משימה"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
            required
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              גודל חלוקה
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setSizeValue((v) => Math.max(1, v - UNIT_STEP[sizeUnit]))}
                className="btn-hover px-2.5 py-2 text-sm text-slate-300"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={sizeValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 1) setSizeValue(v);
                }}
                className="w-16 border-x border-slate-700 bg-slate-900/70 py-2 text-center text-sm text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setSizeValue((v) => v + UNIT_STEP[sizeUnit])}
                className="btn-hover px-2.5 py-2 text-sm text-slate-300"
              >
                +
              </button>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-700">
              {(Object.keys(UNIT_LABELS) as SizeUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    const currentSeconds = sizeValue * UNIT_MULTIPLIER[sizeUnit];
                    const newValue = Math.max(1, Math.round(currentSeconds / UNIT_MULTIPLIER[unit]));
                    setSizeValue(newValue);
                    setSizeUnit(unit);
                  }}
                  className={`px-3 py-2 text-xs transition ${
                    sizeUnit === unit
                      ? "bg-cyan-500/20 text-cyan-100"
                      : "btn-hover text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {UNIT_LABELS[unit]}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500">
              ({partitionSizeSeconds.toLocaleString()} שניות)
            </span>
          </div>

          <RangeEditor ranges={ranges} onChange={setRanges} />

          <button
            type="submit"
            disabled={isCreating}
            className="btn-hover w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 disabled:opacity-50"
          >
            {isCreating ? "יוצר משימה..." : "צור משימה"}
          </button>
        </form>
      </div>
    </div>
  );
}

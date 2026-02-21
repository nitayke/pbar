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
  const [partitionSizeSeconds, setPartitionSizeSeconds] = useState(300);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentUserName.trim()) {
      showMessage("יש להזין שם משתמש לפני יצירת משימה.");
      return;
    }

    const invalidRange = ranges.find(
      (r) => r.timeFrom && r.timeTo && new Date(r.timeTo) <= new Date(r.timeFrom)
    );
    if (invalidRange) {
      showMessage("זמן הסיום חייב להיות אחרי זמן ההתחלה בכל הטווחים");
      return;
    }

    setIsCreating(true);
    const payload: TaskCreateRequest = {
      taskId: taskId.trim(),
      description,
      ranges: buildRequestRanges(ranges, currentUserName),
      partitionSizeSeconds,
    };

    try {
      await createTask(payload);
      showMessage("משימה נוצרה.", 3000);
      onCreated();
      onClose();
    } catch (error) {
      showMessage((error as Error).message);
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

          <div className="flex items-center gap-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              שניות חלוקה
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPartitionSizeSeconds((p) => Math.max(1, p - 10))}
                className="btn-hover px-2.5 py-2 text-sm text-slate-300"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={partitionSizeSeconds}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 1) setPartitionSizeSeconds(v);
                }}
                className="w-16 border-x border-slate-700 bg-slate-900/70 py-2 text-center text-sm text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => setPartitionSizeSeconds((p) => p + 10)}
                className="btn-hover px-2.5 py-2 text-sm text-slate-300"
              >
                +
              </button>
            </div>
          </div>

          <RangeEditor ranges={ranges} onChange={setRanges} />

          <button
            type="submit"
            disabled={isCreating}
            className="btn-hover w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200"
          >
            {isCreating ? "יוצר..." : "צור משימה"}
          </button>
        </form>
      </div>
    </div>
  );
}

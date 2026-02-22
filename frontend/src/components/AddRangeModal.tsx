import { type FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import type { TaskRange } from "../types";
import { toLocalDateTimeValue, formatDuration } from "../lib/taskUtils";

type Props = {
  onClose: () => void;
  onSubmit: (range: TaskRange) => Promise<void>;
  currentUserName: string;
  partitionSizeSeconds?: number;
  showMessage: (text: string, autoDismissMs?: number) => void;
};

export default function AddRangeModal({
  onClose,
  onSubmit,
  currentUserName,
  partitionSizeSeconds,
  showMessage,
}: Props) {
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const isInvalid =
    rangeFrom && rangeTo && new Date(rangeTo) <= new Date(rangeFrom);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rangeFrom || !rangeTo || isInvalid) return;

    if (!currentUserName.trim()) {
      showMessage("יש להזין שם משתמש לפני הוספת טווח.");
      return;
    }

    setIsAdding(true);
    try {
      await onSubmit({
        timeFrom: new Date(rangeFrom).toISOString(),
        timeTo: new Date(rangeTo).toISOString(),
        createdBy: currentUserName,
      });
      onClose();
    } catch (error) {
      showMessage((error as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const diffMs =
    rangeFrom && rangeTo
      ? new Date(rangeTo).getTime() - new Date(rangeFrom).getTime()
      : 0;

  const bulkSize =
    partitionSizeSeconds && diffMs > 0
      ? Math.ceil(diffMs / 1000 / partitionSizeSeconds)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            הוספת טווח
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-hover rounded-lg border border-slate-600 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition"
          >
            סגור
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">זמן התחלה</label>
            <DatePicker
              selected={rangeFrom ? new Date(rangeFrom) : null}
              onChange={(date: Date | null) =>
                setRangeFrom(date ? toLocalDateTimeValue(date) : "")
              }
              showTimeSelect
              timeIntervals={5}
              timeFormat="HH:mm"
              dateFormat="yyyy-MM-dd HH:mm"
              className="date-input w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              placeholderText="זמן התחלה"
              required
              popperContainer={({ children }) =>
                createPortal(children, document.body)
              }
              popperClassName="date-picker-popper"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">זמן סיום</label>
            <DatePicker
              selected={rangeTo ? new Date(rangeTo) : null}
              onChange={(date: Date | null) =>
                setRangeTo(date ? toLocalDateTimeValue(date) : "")
              }
              showTimeSelect
              timeIntervals={5}
              timeFormat="HH:mm"
              dateFormat="yyyy-MM-dd HH:mm"
              className="date-input w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
              placeholderText="זמן סיום"
              required
              popperContainer={({ children }) =>
                createPortal(children, document.body)
              }
              popperClassName="date-picker-popper"
            />
          </div>

          {rangeFrom && rangeTo && !isInvalid && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-center text-xs text-slate-300">
              <span>
                גודל הטווח:{" "}
                <span className="font-medium text-cyan-200">
                  {formatDuration(diffMs)}
                </span>
              </span>
              {bulkSize !== null && (
                <>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>
                    מספר פרטישנים:{" "}
                    <span className="font-medium text-cyan-200">
                      {bulkSize.toLocaleString()}
                    </span>
                  </span>
                </>
              )}
            </div>
          )}

          {isInvalid && (
            <p className="text-xs text-rose-400">
              זמן הסיום חייב להיות אחרי זמן ההתחלה
            </p>
          )}

          <button
            type="submit"
            disabled={isAdding || !!isInvalid}
            className="btn-hover w-full rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 disabled:opacity-50"
          >
            {isAdding ? "מוסיף..." : "הוסף טווח"}
          </button>
        </form>
      </div>
    </div>
  );
}

import DatePicker from "react-datepicker";
import { createPortal } from "react-dom";
import "react-datepicker/dist/react-datepicker.css";

import type { TaskRange } from "../types";

export type RangeDraft = TaskRange & { id: string };

type Props = {
  ranges: RangeDraft[];
  onChange: (ranges: RangeDraft[]) => void;
};

const newRange = (): RangeDraft => ({
  id: crypto.randomUUID(),
  timeFrom: "",
  timeTo: ""
});

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalDateTimeValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;

const parseLocalDateTime = (value: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const popperContainer = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

export default function RangeEditor({ ranges, onChange }: Props) {
  const updateRange = (id: string, field: "timeFrom" | "timeTo", value: string) => {
    onChange(
      ranges.map(range => (range.id === id ? { ...range, [field]: value } : range))
    );
  };

  const removeRange = (id: string) => {
    onChange(ranges.filter(range => range.id !== id));
  };

  return (
    <div className="space-y-3">
      {ranges.map(range => (
        <div key={range.id} className="flex flex-wrap items-center gap-3">
          <DatePicker
            selected={parseLocalDateTime(range.timeFrom)}
            onChange={date => updateRange(range.id, "timeFrom", date ? toLocalDateTimeValue(date) : "")}
            showTimeSelect
            timeIntervals={5}
            timeFormat="HH:mm"
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-input rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm"
            placeholderText="זמן התחלה"
            popperContainer={popperContainer}
            popperClassName="date-picker-popper"
          />
          <DatePicker
            selected={parseLocalDateTime(range.timeTo)}
            onChange={date => updateRange(range.id, "timeTo", date ? toLocalDateTimeValue(date) : "")}
            showTimeSelect
            timeIntervals={5}
            timeFormat="HH:mm"
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-input rounded-md border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm"
            placeholderText="זמן סיום"
            popperContainer={popperContainer}
            popperClassName="date-picker-popper"
          />
          <button
            type="button"
            onClick={() => removeRange(range.id)}
            className="btn-hover rounded-lg border border-rose-500/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-rose-200"
          >
            הסר
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...ranges, newRange()])}
        className="btn-hover rounded-lg border border-slate-600 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200"
      >
        הוסף טווח
      </button>
    </div>
  );
}

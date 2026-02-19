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
          <input
            type="datetime-local"
            value={range.timeFrom}
            onChange={event => updateRange(range.id, "timeFrom", event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={range.timeTo}
            onChange={event => updateRange(range.id, "timeTo", event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => removeRange(range.id)}
            className="rounded-lg border border-rose-500/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-rose-200"
          >
            הסר
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...ranges, newRange()])}
        className="rounded-lg border border-slate-600 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200"
      >
        הוסף טווח
      </button>
    </div>
  );
}

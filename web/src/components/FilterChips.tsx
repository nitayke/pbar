import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onReset?: () => void;
};

export default function FilterChips({ label, value, options, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allOptions = ["all", ...options.filter((o) => o !== "all")];
  const getLabel = (o: string) => (o === "all" ? "הכל" : o);

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
          {label}
        </label>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={value === "all"}
            className="btn-hover rounded-md border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            איפוס
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn-hover flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
      >
        <span>{getLabel(value)}</span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-950/95 p-1 shadow-lg shadow-slate-950/50">
          {allOptions.map((option) => {
            const isActive = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`btn-hover mb-1 w-full rounded-lg px-3 py-2 text-right text-sm transition last:mb-0 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-100"
                    : "text-slate-200 hover:bg-slate-800/80"
                }`}
              >
                {getLabel(option)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

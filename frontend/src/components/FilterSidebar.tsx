import FilterChips from "./FilterChips";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  myTasksOnly: boolean;
  onMyTasksOnlyChange: (value: boolean) => void;
  materialFilter: string;
  onMaterialFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  sourceOptions: string[];
  targetFilter: string;
  onTargetFilterChange: (value: string) => void;
  targetOptions: string[];
  pollSeconds: number;
  onPollSecondsChange: (value: number) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
  message: string | null;
};

const TASK_TYPES = [
  { value: "all", label: "הכל" },
  { value: "reflow", label: "ריפלו" },
  { value: "hermetics", label: "הרמטיות" },
  { value: "other", label: "אחר" },
] as const;

const MATERIAL_TYPES = ["cars", "boys"] as const;

export default function FilterSidebar({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  myTasksOnly,
  onMyTasksOnlyChange,
  materialFilter,
  onMaterialFilterChange,
  sourceFilter,
  onSourceFilterChange,
  sourceOptions,
  targetFilter,
  onTargetFilterChange,
  targetOptions,
  pollSeconds,
  onPollSecondsChange,
  onResetAll,
  hasActiveFilters,
  message,
}: Props) {
  return (
    <div className="glass relative z-20 rounded-3xl p-4">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">סינון</div>

      <div className="mt-4 space-y-5">
        {/* Search */}
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="חיפוש לפי מזהה"
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm"
        />

        {/* Task type */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            סוג משימה
          </label>
          <div className="flex flex-wrap gap-2">
            {TASK_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() =>
                  onFilterTypeChange(
                    filterType === type.value && type.value !== "all"
                      ? "all"
                      : type.value
                  )
                }
                className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition ${
                  filterType === type.value
                    ? "bg-cyan-400/20 text-cyan-100"
                    : "btn-hover border border-slate-600 text-slate-200"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ownership */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            בעלות
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onMyTasksOnlyChange(!myTasksOnly)}
              className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition ${
                myTasksOnly
                  ? "bg-cyan-400/20 text-cyan-100"
                  : "btn-hover border border-slate-600 text-slate-200"
              }`}
            >
              המשימות שלי
            </button>
          </div>
        </div>

        {/* Material type */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            סוג חומר
          </label>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onMaterialFilterChange(
                    materialFilter === option ? "all" : option
                  )
                }
                className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition ${
                  materialFilter === option
                    ? "bg-cyan-400/20 text-cyan-100"
                    : "btn-hover border border-slate-600 text-slate-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Source & Target dropdowns */}
        <FilterChips
          label="מקור מידע"
          value={sourceFilter}
          options={sourceOptions}
          onChange={onSourceFilterChange}
          onReset={() => onSourceFilterChange("all")}
        />
        <FilterChips
          label="יעד מידע"
          value={targetFilter}
          options={targetOptions}
          onChange={onTargetFilterChange}
          onReset={() => onTargetFilterChange("all")}
        />

        {/* Reset all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetAll}
            className="btn-hover w-full rounded-lg border border-rose-500/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-rose-200"
          >
            איפוס כל הסינונים
          </button>
        )}

        {/* Poll interval */}
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            רענון (ש')
          </label>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => onPollSecondsChange(Math.max(2, pollSeconds - 1))}
              className="btn-hover px-2 py-1 text-sm text-slate-300"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={pollSeconds}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 2) onPollSecondsChange(v);
              }}
              className="w-12 border-x border-slate-700 bg-slate-900/70 py-1 text-center text-sm text-slate-100 outline-none"
            />
            <button
              type="button"
              onClick={() => onPollSecondsChange(pollSeconds + 1)}
              className="btn-hover px-2 py-1 text-sm text-slate-300"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {message && <div className="mt-3 text-xs text-amber-200">{message}</div>}
    </div>
  );
}

import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { TaskStatusHistogram } from "../types";

type Props = {
  histogram: TaskStatusHistogram | null;
  isLoading?: boolean;
  taskId?: string;
  partitionSizeSeconds?: number;
  onZoomRange?: (from: Date, to: Date) => void;
};

const preferredStatusOrder = ["done", "completed", "complete", "in_progress", "inprogress", "running", "todo"];

const sortStatuses = (statuses: string[]) =>
  statuses.sort((left, right) => {
    const leftIndex = preferredStatusOrder.indexOf(left);
    const rightIndex = preferredStatusOrder.indexOf(right);
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }
    return left.localeCompare(right);
  });

const getStatusColor = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "done" || normalized === "completed" || normalized === "complete") {
    return "#34d399";
  }
  if (normalized === "in_progress" || normalized === "inprogress" || normalized === "running") {
    return "#fbbf24";
  }
  if (normalized === "todo") {
    return "#94a3b8";
  }
  return "#38bdf8";
};

const getStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "done" || normalized === "completed" || normalized === "complete") {
    return "הושלם";
  }
  if (normalized === "in_progress" || normalized === "inprogress" || normalized === "running") {
    return "בתהליך";
  }
  if (normalized === "todo") {
    return "לביצוע";
  }
  return status;
};

export default function StatusHistogramChart({ histogram, isLoading, taskId, partitionSizeSeconds, onZoomRange }: Props) {
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const chart = useMemo(() => {
    if (!histogram || histogram.buckets.length === 0) {
      return { categories: [], series: [] };
    }

    const categories = histogram.buckets.map(bucket => new Date(bucket.timestampUtc));
    const statusSet = new Set<string>();
    histogram.buckets.forEach(bucket =>
      bucket.statuses.forEach(statusEntry => statusSet.add(statusEntry.status.toLowerCase()))
    );

    const statuses = sortStatuses(Array.from(statusSet));

    const series = statuses.map(status => ({
      name: getStatusLabel(status),
      rawStatus: status,
      type: "bar" as const,
      stack: "total",
      emphasis: { focus: "series" as const },
      itemStyle: {
        color: getStatusColor(status)
      },
      data: histogram.buckets.map(bucket =>
        bucket.statuses.find(entry => entry.status.toLowerCase() === status)?.count ?? 0
      )
    }));

    return { categories, series };
  }, [histogram]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="mt-4 flex h-48 items-end gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
          <div className="h-16 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-24 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-20 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-28 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
          <div className="h-14 flex-1 animate-pulse rounded-sm bg-slate-800/80" />
        </div>
      </div>
    );
  }

  if (!histogram || histogram.buckets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>
        <div className="mt-4 flex h-48 items-end gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2">
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
          <div className="h-10 flex-1 rounded-sm bg-slate-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4" dir="ltr">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">התפלגות סטטוסים לאורך זמן</div>

      <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/60 p-2" dir="ltr">
        <ReactECharts
          onEvents={{
            dataZoom: (params: any) => {
              if (!onZoomRange || !chart.categories.length) return;
              
              // Clear previous timeout
              if (zoomTimeoutRef.current) {
                clearTimeout(zoomTimeoutRef.current);
              }
              
              // Debounce zoom events
              zoomTimeoutRef.current = setTimeout(() => {
                const batch = params.batch?.[0] || params;
                let startValue = batch.startValue ?? batch.start;
                let endValue = batch.endValue ?? batch.end;
                
                // If we have percentage values, convert to timestamp
                if (startValue !== undefined && endValue !== undefined) {
                  if (startValue <= 100 && endValue <= 100) {
                    // These are percentages, convert to indices
                    const startIndex = Math.floor((startValue / 100) * chart.categories.length);
                    const endIndex = Math.ceil((endValue / 100) * chart.categories.length);
                    const from = chart.categories[Math.max(0, startIndex)];
                    const to = chart.categories[Math.min(chart.categories.length - 1, endIndex)];
                    if (from && to) {
                      onZoomRange(from, to);
                    }
                  } else {
                    // These are timestamps
                    const from = new Date(startValue);
                    const to = new Date(endValue);
                    onZoomRange(from, to);
                  }
                }
              }, 500); // Wait 500ms after user stops zooming
            }
          }}
          option={{
            backgroundColor: "transparent",
            textStyle: { color: "#e2e8f0", fontFamily: "Heebo" },
            grid: { left: 30, right: 20, top: 40, bottom: 64, containLabel: true },
            tooltip: { trigger: "axis" },
            legend: {
              top: 0,
              right: 0,
              align: "right",
              textStyle: { color: "#cbd5f5" },
              formatter: (name: string) => `\u200F${name}`
            },
            xAxis: {
              type: "time",
              axisLabel: { color: "#94a3b8" },
              axisLine: { lineStyle: { color: "#334155" } },
              splitLine: { show: false }
            },
            yAxis: {
              type: "value",
              axisLabel: { color: "#94a3b8" },
              axisLine: { lineStyle: { color: "#334155" } },
              splitLine: { lineStyle: { color: "rgba(148,163,184,0.15)" } }
            },
            dataZoom: [
              { type: "inside", xAxisIndex: 0 },
              {
                type: "slider",
                xAxisIndex: 0,
                height: 42,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                borderColor: "transparent",
                fillerColor: "rgba(56, 189, 248, 0.25)",
                handleSize: 32,
                handleStyle: {
                  color: "rgba(56, 189, 248, 0.85)",
                  borderColor: "rgba(56, 189, 248, 0.95)",
                  borderWidth: 1
                },
                moveHandleSize: 18,
                showDetail: false
              }
            ],
            series: chart.series.map(series => ({
              name: series.name,
              type: series.type,
              stack: series.stack,
              emphasis: series.emphasis,
              itemStyle: series.itemStyle,
              data: chart.categories.map((time, index) => [time, series.data[index]])
            }))
          }}
          style={{ height: 280 }}
        />
      </div>
    </div>
  );
}

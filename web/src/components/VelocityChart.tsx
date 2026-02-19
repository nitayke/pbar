import type { TaskMetricSample } from "../types";

type Props = {
  samples: TaskMetricSample[];
};

const buildPoints = (samples: TaskMetricSample[], width: number, height: number) => {
  if (samples.length < 2) {
    return "";
  }

  const min = samples[0].done;
  const max = samples[samples.length - 1].done;
  const spread = Math.max(1, max - min);

  return samples
    .map((sample, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - ((sample.done - min) / spread) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

export default function VelocityChart({ samples }: Props) {
  const width = 320;
  const height = 120;
  const points = buildPoints(samples, width, height);

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">קצב</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
        <rect width={width} height={height} fill="transparent" />
        <polyline
          points={points}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

import type { TaskProgress } from "../types";

type Props = {
  progress?: TaskProgress;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export default function ProgressBar({ progress }: Props) {
  if (!progress || progress.total === 0) {
    return (
      <div className="h-3 rounded-full bg-slate-800/80">
        <div className="h-3 rounded-full bg-slate-700/80" style={{ width: "100%" }} />
      </div>
    );
  }

  const done = clamp(progress.percentDone);
  const inProgress = clamp(progress.percentInProgress);
  const todo = clamp(100 - done - inProgress);

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
      <div className="flex h-3">
        <div className="h-3 bg-lime" style={{ width: `${done}%` }} />
        <div className="h-3 bg-tide" style={{ width: `${inProgress}%` }} />
        <div className="h-3 bg-slate-700" style={{ width: `${todo}%` }} />
      </div>
    </div>
  );
}

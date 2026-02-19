export type TaskProgress = {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  percentDone: number;
  percentInProgress: number;
  percentTodo: number;
};

export type TaskSummary = {
  taskId: string;
  description: string;
  lastUpdate: string;
  createdBy: string;
  partitionSizeSeconds?: number;
  type: "reflow" | "hermetics" | "other";
  progress?: TaskProgress;
};

export type TaskRange = {
  timeFrom: string;
  timeTo: string;
};

export type TaskMetricSample = {
  timestampUtc: string;
  done: number;
  total: number;
};

export type TaskMetrics = {
  progress: TaskProgress;
  partitionsPerMinute?: number;
  estimatedMinutesRemaining?: number;
  estimatedFinishUtc?: string;
  samples: TaskMetricSample[];
};

export type TaskCreateRequest = {
  taskId: string;
  description?: string;
  createdBy?: string;
  ranges: TaskRange[];
  partitionMinutes?: number;
  partitionSizeSeconds?: number;
};

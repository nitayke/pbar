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
  partitionSizeSeconds?: number;
  type: "reflow" | "hermetics" | "other";
  progress?: TaskProgress;
};

export type TaskRange = {
  rangeId?: string;
  timeFrom: string;
  timeTo: string;
  creationTime?: string;
  createdBy?: string;
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

export type TaskStatusCount = {
  status: string;
  count: number;
};

export type TaskStatusHistogramBucket = {
  timestampUtc: string;
  statuses: TaskStatusCount[];
};

export type TaskStatusHistogram = {
  intervalSeconds: number;
  buckets: TaskStatusHistogramBucket[];
};

export type TaskCreateRequest = {
  taskId: string;
  description?: string;
  ranges: TaskRange[];
  partitionMinutes?: number;
  partitionSizeSeconds?: number;
};

export type ScheduledTask = {
  scheduleId: string;
  taskId: string;
  intervalSeconds: number;
  bulkSizeSeconds: number;
  lastExecutionTime?: string;
  nextExecutionTime?: string;
  isEnabled: boolean;
  createdAt: string;
  createdBy: string;
};

export type ScheduledTaskCreateRequest = {
  taskId: string;
  intervalSeconds: number;
  bulkSizeSeconds: number;
  createdBy: string;
};

export type ScheduledTaskUpdateRequest = {
  intervalSeconds?: number;
  bulkSizeSeconds?: number;
  isEnabled?: boolean;
};

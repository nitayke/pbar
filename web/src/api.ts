import type {
  TaskCreateRequest,
  TaskMetrics,
  TaskProgress,
  TaskRange,
  TaskStatusHistogram,
  TaskSummary
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000/api";
const rawMock = import.meta.env.VITE_USE_MOCK;
const USE_MOCK = rawMock === undefined
  ? true
  : String(rawMock).toLowerCase() === "true" || String(rawMock) === "1";

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const request = async <T>(path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const buildProgress = (total: number, done: number, inProgress = 0): TaskProgress => {
  const safeTotal = Math.max(0, total);
  const safeDone = Math.max(0, Math.min(done, safeTotal));
  const safeInProgress = Math.max(0, Math.min(inProgress, safeTotal - safeDone));
  const todo = Math.max(0, safeTotal - safeDone - safeInProgress);
  return {
    total: safeTotal,
    done: safeDone,
    inProgress: safeInProgress,
    todo,
    percentDone: safeTotal ? Math.round((safeDone * 10000) / safeTotal) / 100 : 0,
    percentInProgress: safeTotal ? Math.round((safeInProgress * 10000) / safeTotal) / 100 : 0,
    percentTodo: safeTotal ? Math.round((todo * 10000) / safeTotal) / 100 : 0
  };
};

const mockUsers = ["alice", "ben", "dana", "matan", "shira", "yossi"];

const mockState: Record<string, { lastTick: number }> = {};

const mockTasks: TaskSummary[] = [
  {
    taskId: "reflow-cars-elastic-west-to-elastic-east",
    description: "בדיקת ריפלו",
    lastUpdate: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdBy: "dana",
    partitionSizeSeconds: 300,
    type: "reflow",
    progress: buildProgress(1200, 820, 210)
  },
  {
    taskId: "hermetics-boys-oracle-east-to-elastic-west",
    description: "שיפור תהליך",
    lastUpdate: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    createdBy: "yossi",
    partitionSizeSeconds: 600,
    type: "hermetics",
    progress: buildProgress(900, 420, 190)
  },
  {
    taskId: "reflow-boys-oracle-west-to-elastic-east",
    description: "תחזוקה",
    lastUpdate: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    createdBy: "alice",
    partitionSizeSeconds: 300,
    type: "other",
    progress: buildProgress(300, 120, 30)
  }
];

const mockRanges: Record<string, TaskRange[]> = {
  "reflow-cars-elastic-west-to-elastic-east": [
    {
      timeFrom: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      timeTo: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    },
    {
      timeFrom: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      timeTo: new Date(Date.now() - 1000 * 60 * 60).toISOString()
    }
  ],
  "hermetics-boys-oracle-east-to-elastic-west": [
    {
      timeFrom: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      timeTo: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    }
  ],
  "reflow-boys-oracle-west-to-elastic-east": [
    {
      timeFrom: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      timeTo: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    }
  ]
};

const buildSamples = (total: number, done: number, points = 8) => {
  const samples = [] as TaskMetrics["samples"];
  const start = Math.max(0, done - Math.floor(done * 0.6));
  const step = points > 1 ? Math.max(1, Math.floor((done - start) / (points - 1))) : 1;
  for (let i = 0; i < points; i += 1) {
    samples.push({
      timestampUtc: new Date(Date.now() - (points - i) * 60000).toISOString(),
      done: Math.min(done, start + step * i),
      total
    });
  }
  return samples;
};

const mockMetrics: Record<string, TaskMetrics> = {
  "reflow-cars-elastic-west-to-elastic-east": {
    progress: buildProgress(1200, 820, 210),
    partitionsPerMinute: 14.2,
    estimatedMinutesRemaining: 18.5,
    estimatedFinishUtc: new Date(Date.now() + 1000 * 60 * 19).toISOString(),
    samples: buildSamples(1200, 820)
  },
  "hermetics-boys-oracle-east-to-elastic-west": {
    progress: buildProgress(900, 420, 190),
    partitionsPerMinute: 9.6,
    estimatedMinutesRemaining: 30.2,
    estimatedFinishUtc: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    samples: buildSamples(900, 420)
  },
  "reflow-boys-oracle-west-to-elastic-east": {
    progress: buildProgress(300, 120, 30),
    partitionsPerMinute: 4.3,
    estimatedMinutesRemaining: 26.4,
    estimatedFinishUtc: new Date(Date.now() + 1000 * 60 * 26).toISOString(),
    samples: buildSamples(300, 120)
  }
};

const buildMockStatusHistogram = (taskId: string, intervalSeconds = 300): TaskStatusHistogram => {
  const task = mockTasks.find(entry => entry.taskId === taskId);
  const progress = task?.progress ?? buildProgress(0, 0, 0);
  const bucketCount = 12;

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const ratio = (index + 1) / bucketCount;
    const done = Math.round(progress.done * ratio);
    const inProgress = Math.round(progress.inProgress * ratio);
    const todo = Math.max(0, progress.total - done - inProgress);

    const statuses = [
      { status: "done", count: done },
      { status: "in_progress", count: inProgress },
      { status: "todo", count: todo }
    ].filter(item => item.count > 0);

    return {
      timestampUtc: new Date(Date.now() - (bucketCount - index) * intervalSeconds * 1000).toISOString(),
      statuses
    };
  });

  return {
    intervalSeconds,
    buckets
  };
};

const advanceTask = (taskId: string) => {
  const task = mockTasks.find(entry => entry.taskId === taskId);
  if (!task || !task.progress) {
    return;
  }

  const now = Date.now();
  const state = mockState[taskId] ?? { lastTick: now };
  const elapsedSeconds = Math.max(0, (now - state.lastTick) / 1000);
  state.lastTick = now;
  mockState[taskId] = state;

  const metrics = mockMetrics[taskId];
  const rate = metrics?.partitionsPerMinute ?? 6;
  const increment = Math.floor((rate * elapsedSeconds) / 60);
  if (increment <= 0) {
    return;
  }

  const nextDone = Math.min(task.progress.total, task.progress.done + increment);
  task.progress = buildProgress(task.progress.total, nextDone, task.progress.inProgress);
  task.lastUpdate = new Date().toISOString();

  if (metrics) {
    metrics.progress = task.progress;
    const sample = {
      timestampUtc: new Date().toISOString(),
      done: task.progress.done,
      total: task.progress.total
    };
    metrics.samples = [...metrics.samples.slice(-11), sample];
  }
};

const mockApi = {
  getUsers: async (query?: string) => {
    if (!query) {
      return mockUsers.slice(0, 10);
    }
    return mockUsers.filter(user => user.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  },

  getTasks: async (params: {
    type?: string;
    search?: string;
    skip?: number;
    take?: number;
    includeProgress?: boolean;
  }) => {
    let items = [...mockTasks];
    if (params.search) {
      items = items.filter(task => task.taskId.includes(params.search ?? ""));
    }
    if (params.type && params.type !== "all") {
      items = items.filter(task => task.type === params.type);
    }
    const start = Math.max(0, params.skip ?? 0);
    const end = start + Math.min(params.take ?? 200, 500);
    return items.slice(start, end);
  },

  getTaskRanges: async (taskId: string) => mockRanges[taskId] ?? [],

  getProgress: async (taskId: string) => {
    advanceTask(taskId);
    return mockTasks.find(task => task.taskId === taskId)?.progress ?? buildProgress(0, 0, 0);
  },

  getMetrics: async (taskId: string) => {
    advanceTask(taskId);
    return mockMetrics[taskId] ?? {
      progress: buildProgress(0, 0, 0),
      samples: []
    };
  },

  getStatusHistogram: async (taskId: string, intervalSeconds?: number) => {
    advanceTask(taskId);
    return buildMockStatusHistogram(taskId, intervalSeconds ?? 300);
  },

  createTask: async (payload: TaskCreateRequest) => {
    if (!payload.taskId) {
      throw new Error("TaskId is required.");
    }
    if (mockTasks.some(task => task.taskId === payload.taskId)) {
      throw new Error("Task already exists.");
    }
    const total = Math.max(1, payload.ranges.length * 120);
    const progress = buildProgress(total, 0, 0);
    const rate = Math.max(3, Math.round(5 + Math.random() * 8));
    const partitionSizeSeconds = payload.partitionSizeSeconds
      ?? (payload.partitionMinutes ? payload.partitionMinutes * 60 : undefined)
      ?? 300;
    const task: TaskSummary = {
      taskId: payload.taskId,
      description: payload.description ?? "",
      lastUpdate: new Date().toISOString(),
      createdBy: payload.createdBy ?? "",
      partitionSizeSeconds,
      type: payload.taskId.toLowerCase().includes("reflow")
        ? "reflow"
        : payload.taskId.toLowerCase().includes("hermetics")
          ? "hermetics"
          : "other",
      progress
    };
    mockTasks.unshift(task);
    mockRanges[payload.taskId] = payload.ranges ?? [];
    mockMetrics[payload.taskId] = {
      progress,
      partitionsPerMinute: rate,
      estimatedMinutesRemaining: total / rate,
      estimatedFinishUtc: new Date(Date.now() + (total / rate) * 60000).toISOString(),
      samples: buildSamples(total, 0, 6)
    };
    mockState[payload.taskId] = { lastTick: Date.now() };
  },

  deleteTask: async (taskId: string) => {
    const index = mockTasks.findIndex(task => task.taskId === taskId);
    if (index >= 0) {
      mockTasks.splice(index, 1);
    }
    delete mockRanges[taskId];
    delete mockMetrics[taskId];
    delete mockState[taskId];
  },

  deletePartitions: async (taskId: string) => {
    const task = mockTasks.find(entry => entry.taskId === taskId);
    if (task?.progress) {
      task.progress = buildProgress(task.progress.total, 0, 0);
    }
    if (mockMetrics[taskId]) {
      mockMetrics[taskId].progress = task?.progress ?? buildProgress(0, 0, 0);
      mockMetrics[taskId].samples = buildSamples(task?.progress?.total ?? 0, 0, 6);
    }
  },

  deleteRange: async (taskId: string, from: string, to: string, mode: string) => {
    const list = mockRanges[taskId];
    if (!list) {
      return;
    }
    if (mode === "range" || mode === "all") {
      mockRanges[taskId] = list.filter(range => range.timeFrom !== from || range.timeTo !== to);
    }
  }
};

export const api = USE_MOCK
  ? mockApi
  : {
      getUsers: (query?: string) =>
        request<string[]>(`/users${buildQuery({ query })}`),

      getTasks: (params: {
        type?: string;
        search?: string;
        skip?: number;
        take?: number;
        includeProgress?: boolean;
      }) => request<TaskSummary[]>(`/tasks${buildQuery(params)}`),

      getTaskRanges: (taskId: string) =>
        request<TaskRange[]>(`/tasks/${encodeURIComponent(taskId)}/ranges`),

      getProgress: (taskId: string) =>
        request<TaskProgress>(`/tasks/${encodeURIComponent(taskId)}/progress`),

      getMetrics: (taskId: string) =>
        request<TaskMetrics>(`/tasks/${encodeURIComponent(taskId)}/metrics`),

      getStatusHistogram: (taskId: string, intervalSeconds?: number) =>
        request<TaskStatusHistogram>(
          `/tasks/${encodeURIComponent(taskId)}/status-histogram${buildQuery({ intervalSeconds })}`
        ),

      createTask: (payload: TaskCreateRequest) =>
        request(`/tasks`, { method: "POST", body: JSON.stringify(payload) }),

      deleteTask: (taskId: string) =>
        request(`/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }),

      deletePartitions: (taskId: string) =>
        request(`/tasks/${encodeURIComponent(taskId)}/partitions`, { method: "DELETE" }),

      deleteRange: (taskId: string, from: string, to: string, mode: string) =>
        request(
          `/tasks/${encodeURIComponent(taskId)}/ranges${buildQuery({ from, to, delete: mode })}`,
          { method: "DELETE" }
        )
    };

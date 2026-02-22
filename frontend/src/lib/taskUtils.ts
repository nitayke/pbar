import type { TaskRange } from "../types";
import type { RangeDraft } from "../components/RangeEditor";

export const USER_NAME_STORAGE_KEY = "pbar.currentUserName";

const pad = (v: number) => String(v).padStart(2, "0");

export const toLocalISOString = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export const toLocalDateTimeValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const buildRequestRanges = (
  ranges: RangeDraft[],
  createdBy: string
): TaskRange[] =>
  ranges
    .filter((range) => range.timeFrom && range.timeTo)
    .map((range) => ({
      timeFrom: toLocalISOString(new Date(range.timeFrom)),
      timeTo: toLocalISOString(new Date(range.timeTo)),
      createdBy,
    }));

export type TaskMeta = {
  processType: string | undefined;
  materialType: string | undefined;
  sourceSystem: string | undefined;
  targetSystem: string | undefined;
};

export const parseTaskMeta = (taskId: string): TaskMeta => {
  const [leftSide, targetSide] = taskId.split("-to-");
  const leftParts = (leftSide ?? "").split("-").filter(Boolean);

  return {
    processType: leftParts[0],
    materialType: leftParts[1],
    sourceSystem: leftParts.slice(2).join("-") || undefined,
    targetSystem: targetSide || undefined,
  };
};

export const formatDuration = (diffMs: number): string => {
  const weeks = Math.floor(diffMs / 604_800_000);
  const days = Math.floor((diffMs % 604_800_000) / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks} שבועות`);
  if (days > 0) parts.push(`${days} ימים`);
  if (hours > 0) parts.push(`${hours} שעות`);
  if (minutes > 0) parts.push(`${minutes} דקות`);
  return parts.join(" ו-") || "פחות מדקה";
};

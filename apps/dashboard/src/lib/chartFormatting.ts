import type { XAxisProps } from "recharts";

type ChartDateValue = string | number | null | undefined;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;
const TICK_PITCH_PX = 92;

function parseChartDate(value: ChartDateValue) {
  if (value == null || value === "") return undefined;
  const raw = String(value);
  const date = new Date(raw.length === 7 ? `${raw}-01T00:00:00.000Z` : raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function hasDay(value: ChartDateValue) {
  return /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(String(value ?? ""));
}

function hasTime(value: ChartDateValue) {
  return /T\d{2}:\d{2}/.test(String(value ?? ""));
}

/** Compact UTC labels for the plotted axis; years appear when the range crosses a year boundary. */
export function formatDateTick(value: ChartDateValue, includeYear = false) {
  const date = parseChartDate(value);
  if (!date) return String(value ?? "");
  const options: Intl.DateTimeFormatOptions = hasDay(value)
    ? { month: "short", day: "numeric", ...(includeYear ? { year: "numeric" } : {}) }
    : { month: "short", ...(includeYear ? { year: "numeric" } : {}) };
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

/** Full tooltip label, retaining the exact bucket date and timestamp when one is provided. */
export function formatTooltipDate(value: ChartDateValue) {
  const date = parseChartDate(value);
  if (!date) return String(value ?? "");
  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
  if (!hasTime(value)) return `${dateLabel} (UTC)`;
  const timeLabel = new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone: "UTC" }).format(date);
  return `${dateLabel}, ${timeLabel} UTC`;
}

/**
 * Recharts calculates which category ticks fit from the rendered axis width.
 * preserveStartEnd keeps the useful endpoints while minTickGap removes labels
 * until their measured spacing fits, so the same chart adapts to each card size.
 */
export function getResponsiveTickProps(labelCount: number): Pick<XAxisProps, "interval" | "minTickGap" | "tickMargin"> {
  return {
    interval: "preserveStartEnd",
    minTickGap: labelCount > 90 ? 48 : 36,
    tickMargin: 8,
  };
}

function uniformTickIndices(length: number, desiredCount: number) {
  if (length <= 1 || desiredCount >= length) return Array.from({ length }, (_, index) => index);
  const step = Math.max(1, Math.ceil((length - 1) / Math.max(1, desiredCount - 1)));
  const indices: number[] = [];
  for (let index = 0; index < length; index += step) indices.push(index);
  return indices;
}

export function getResponsiveDateAxisProps(labels: readonly string[], chartWidth = 0): Pick<XAxisProps, "interval" | "minTickGap" | "tickFormatter" | "tick" | "tickMargin" | "ticks"> {
  const dates = labels.map(parseChartDate).filter((date): date is Date => Boolean(date));
  const years = new Set(dates.map((date) => date.getUTCFullYear()));
  const availableWidth = Math.max(0, chartWidth - 64);
  const desiredCount = chartWidth > 0 ? Math.max(2, Math.floor(availableWidth / TICK_PITCH_PX)) : 0;
  const ticks = desiredCount > 0 ? uniformTickIndices(labels.length, desiredCount).map((index) => labels[index]) : undefined;
  return {
    ...(chartWidth > 0 ? { interval: 0 as const } : getResponsiveTickProps(labels.length)),
    ...(ticks ? { ticks } : {}),
    minTickGap: 36,
    tickMargin: 8,
    tickFormatter: (value) => formatDateTick(value, years.size > 1),
    tick: AXIS_TICK,
  };
}

export const chartAxisTick = AXIS_TICK;
export const chartMargin = { top: 8, right: 8, bottom: 8, left: 0 } as const;

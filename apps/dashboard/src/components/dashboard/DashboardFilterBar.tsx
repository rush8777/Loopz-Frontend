import { AnalyticsFilterBar, type AppliedFilters, type FilterDefinition } from "@/components/filters/AnalyticsFilterBar";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import type { DashboardFilters, EventDefinitionSummary, Segment } from "@/types/api";

export function defaultDashboardFilters(): DashboardFilters { const now = new Date(), since = new Date(now); since.setUTCDate(since.getUTCDate() - 30); return { since: since.toISOString(), until: now.toISOString(), granularity: "day", excludedEventNames: [] }; }

/** Uses the same single-button filter control as Overview, with dashboard-specific choices in its dialog. */
export function DashboardFilterBar({ value, segments, events, onChange }: { value: DashboardFilters; segments: Segment[]; events: EventDefinitionSummary[]; onChange: (value: DashboardFilters) => void }) {
  const definitions: FilterDefinition[] = [
    { key: "range", label: "Date range", options: [{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }] },
    { key: "granularity", label: "Granularity", options: [{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }] },
    { key: "segmentId", label: "Audience", options: segments.map((segment) => ({ value: segment.id, label: segment.name })) },
    { key: "excludedEventNames", label: "Exclude events", options: events.map((event) => ({ value: event.name, label: event.name })), multiple: true },
  ];
  const values: AppliedFilters = { range: dateRangePreset(value), granularity: value.granularity === "day" ? undefined : value.granularity, segmentId: value.segmentId, excludedEventNames: value.excludedEventNames };

  return <AnalyticsFilterBar definitions={definitions} values={values} onChange={(next) => {
    const preset = next.range as DateRangePreset | undefined;
    const range = preset ? resolveDateRange(preset) : resolveDateRange("30d")!;
    onChange({ ...value, ...range, granularity: (next.granularity as DashboardFilters["granularity"] | undefined) ?? "day", segmentId: next.segmentId as string | undefined, excludedEventNames: Array.isArray(next.excludedEventNames) ? next.excludedEventNames : next.excludedEventNames ? [next.excludedEventNames] : [] });
  }} />;
}

function dateRangePreset(value: DashboardFilters): Exclude<DateRangePreset, "custom"> | undefined {
  const since = new Date(value.since);
  const duration = new Date(value.until).getTime() - since.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (since.getHours() === 0 && since.getMinutes() === 0 && since.getSeconds() === 0 && duration <= day) return "today";
  if (Math.abs(duration - 7 * day) < 60_000) return "7d";
  if (Math.abs(duration - 90 * day) < 60_000) return "90d";
  // Thirty days is the dashboard default, so it stays out of the applied-filter count.
  return undefined;
}

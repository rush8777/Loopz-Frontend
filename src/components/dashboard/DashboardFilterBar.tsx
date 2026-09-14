import { DateRangePicker } from "@/components/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import type { DashboardFilters, Segment } from "@/types/api";
import { useState } from "react";

export function defaultDashboardFilters(): DashboardFilters { const now = new Date(), since = new Date(now); since.setUTCDate(since.getUTCDate() - 30); return { since: since.toISOString(), until: now.toISOString(), granularity: "day", excludedEventNames: [] }; }
export function DashboardFilterBar({ value, segments, onChange }: { value: DashboardFilters; segments: Segment[]; onChange: (value: DashboardFilters) => void }) {
  const [preset, setPreset] = useState<DateRangePreset>("30d"); const [customSince, setCustomSince] = useState<string>(); const [customUntil, setCustomUntil] = useState<string>();
  return <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
    <DateRangePicker preset={preset} customSince={customSince} customUntil={customUntil} onChange={(next, from, to) => { setPreset(next); setCustomSince(from); setCustomUntil(to); const range = resolveDateRange(next, from, to); if (range) onChange({ ...value, ...range }); }} />
    <Select value={value.granularity} onValueChange={(granularity: DashboardFilters["granularity"]) => onChange({ ...value, granularity })}><SelectTrigger className="w-32" aria-label="Granularity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem></SelectContent></Select>
    <Select value={value.segmentId ?? "all"} onValueChange={(segmentId) => onChange({ ...value, segmentId: segmentId === "all" ? undefined : segmentId })}><SelectTrigger className="w-48" aria-label="Segment"><SelectValue placeholder="All users" /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem>{segments.map((segment) => <SelectItem key={segment.id} value={segment.id}>{segment.name}</SelectItem>)}</SelectContent></Select>
    <Input className="min-w-52 flex-1" aria-label="Excluded events" placeholder="Exclude test events (comma separated)" value={value.excludedEventNames.join(", ")} onChange={(event) => onChange({ ...value, excludedEventNames: event.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 50) })} />
    <span className="text-xs text-muted-foreground">Buckets use UTC</span>
  </div>;
}

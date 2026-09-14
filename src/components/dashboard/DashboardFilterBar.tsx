import { DateRangePicker } from "@/components/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import type { DashboardFilters, Segment } from "@/types/api";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export function defaultDashboardFilters(): DashboardFilters { const now = new Date(), since = new Date(now); since.setUTCDate(since.getUTCDate() - 30); return { since: since.toISOString(), until: now.toISOString(), granularity: "day", excludedEventNames: [] }; }
export function DashboardFilterBar({ value, segments, onChange }: { value: DashboardFilters; segments: Segment[]; onChange: (value: DashboardFilters) => void }) {
  const [preset, setPreset] = useState<DateRangePreset>("30d"); const [customSince, setCustomSince] = useState<string>(); const [customUntil, setCustomUntil] = useState<string>(); const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasExcludedEvents = value.excludedEventNames.length > 0;
  const updateExcludedEvents = (input: string) => onChange({ ...value, excludedEventNames: input.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 50) });

  return <div className="mb-6 rounded-lg border bg-card px-3 py-2.5 sm:px-4">
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker preset={preset} customSince={customSince} customUntil={customUntil} compact labelOverrides={{ "7d": "7D", "30d": "30D", "90d": "90D" }} onChange={(next, from, to) => { setPreset(next); setCustomSince(from); setCustomUntil(to); const range = resolveDateRange(next, from, to); if (range) onChange({ ...value, ...range }); }} />
      <Select value={value.granularity} onValueChange={(granularity: DashboardFilters["granularity"]) => onChange({ ...value, granularity })}><SelectTrigger className="h-8 w-[104px] shrink-0 rounded-md" aria-label="Granularity"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem></SelectContent></Select>
      <Select value={value.segmentId ?? "all"} onValueChange={(segmentId) => onChange({ ...value, segmentId: segmentId === "all" ? undefined : segmentId })}><SelectTrigger className="h-8 w-[140px] shrink-0 rounded-md" aria-label="Segment"><SelectValue placeholder="All users" /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem>{segments.map((segment) => <SelectItem key={segment.id} value={segment.id}>{segment.name}</SelectItem>)}</SelectContent></Select>
      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-md px-2.5" aria-expanded={advancedOpen} aria-controls="dashboard-advanced-filters" onClick={() => setAdvancedOpen((open) => !open)}><Plus className="size-3.5" />Filter</Button>
      {hasExcludedEvents && <span className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 text-xs font-medium text-foreground"><span className="truncate">Test events excluded</span><button type="button" aria-label="Remove test events filter" className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground" onClick={() => onChange({ ...value, excludedEventNames: [] })}><X className="size-3" /></button></span>}
      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground" title="Date buckets use UTC">UTC buckets</span>
    </div>
    {advancedOpen && <div id="dashboard-advanced-filters" className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2.5">
      <label htmlFor="dashboard-excluded-events" className="grid gap-1 text-xs font-medium text-muted-foreground"><span>Exclude test events</span><Input id="dashboard-excluded-events" className="h-8 w-full sm:w-[280px]" aria-label="Excluded events" placeholder="Comma-separated event names" value={value.excludedEventNames.join(", ")} onChange={(event) => updateExcludedEvents(event.target.value)} /></label>
      <span className="pb-1 text-[11px] text-muted-foreground">Optional · up to 50 events</span>
    </div>}
  </div>;
}

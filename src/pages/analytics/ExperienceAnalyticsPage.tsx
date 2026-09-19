import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import { useWorkspace } from "@/auth/WorkspaceContext";
import * as experiencesApi from "@/api/experiences";
import type { Experience, ExperienceAnalytics } from "@/types/experiences";
import { PageHeader } from "@/components/PageHeader";
import { AnalyticsMetricCard } from "@/components/analytics/AnalyticsMetricCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { chartAxisTick, chartMargin, getResponsiveDateAxisProps } from "@/lib/chartFormatting";

type TrendMetric = "viewers" | "engagement" | "completion" | "goal";
type StatusFilter = "all" | Experience["status"];
type TrendPoint = { date: string; viewers: number; engagement: number; completion: number };

const DAY = 86_400_000;
const metricLabels: Record<TrendMetric, string> = { viewers: "Viewers", engagement: "Engagement", completion: "Completion", goal: "Goal conversion" };
const percent = (numerator: number, denominator: number) => denominator ? Math.round(numerator / denominator * 1000) / 10 : 0;
const displayRate = (value: number | null) => value === null ? "—" : `${value}%`;
function labelFor(item: ExperienceAnalytics) { return item.experience.widgetType === "survey" ? "Survey" : item.experience.kind === "guide" ? "Guide" : (item.experience.widgetType ?? "Widget").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase()); }
function completionFor(item: ExperienceAnalytics) { return item.survey ? item.survey.responseRate : item.experience.kind === "guide" ? item.summary.completionRate : null; }
function engagementFor(item: ExperienceAnalytics) { return percent(item.summary.usersStarted, item.summary.usersSeen); }

export function ExperienceAnalyticsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [items, setItems] = useState<ExperienceAnalytics[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [days, setDays] = useState(30); const [metric, setMetric] = useState<TrendMetric>("viewers");
  const [search, setSearch] = useState(""); const [type, setType] = useState("all"); const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    const until = new Date(); const since = new Date(until.getTime() - days * DAY);
    setLoading(true); setError(undefined);
    Promise.all([
      experiencesApi.listExperienceAnalytics(currentOrg.orgId, currentSite.id, { since: since.toISOString(), until: until.toISOString() }),
      experiencesApi.listExperiences(currentOrg.orgId, currentSite.id),
    ]).then(([analytics, experienceList]) => { setItems(analytics.experiences); setExperiences(experienceList.experiences); })
      .catch(reason => setError(reason instanceof Error ? reason.message : "Could not load experience analytics."))
      .finally(() => setLoading(false));
  }, [currentOrg, currentSite, days]);

  const statusById = useMemo(() => new Map(experiences.map(item => [item.id, item.status])), [experiences]);
  const summary = useMemo(() => {
    const viewers = items.reduce((total, item) => total + item.summary.usersSeen, 0);
    const interactions = items.reduce((total, item) => total + item.summary.usersStarted, 0);
    const eligible = items.filter(item => completionFor(item) !== null);
    const completed = eligible.reduce((total, item) => total + (item.survey?.submitted ?? item.summary.completed), 0);
    const eligibleViewers = eligible.reduce((total, item) => total + item.summary.usersSeen, 0);
    return { viewers, engagement: percent(interactions, viewers), completion: eligible.length ? percent(completed, eligibleViewers) : null };
  }, [items]);
  const trend = useMemo(() => buildTrend(items, days), [items, days]);
  const types = useMemo(() => [...new Set(items.map(labelFor))].sort(), [items]);
  const visibleItems = useMemo(() => items.filter(item => item.experience.name.toLowerCase().includes(search.trim().toLowerCase()) && (type === "all" || labelFor(item) === type) && (status === "all" || statusById.get(item.experience.id) === status)), [items, search, status, statusById, type]);

  return <><PageHeader className="mb-6" section="Overview" title="Experience Overview" description="Understand who sees your experiences and how they respond." actions={<select aria-label="Date range" className="h-9 rounded-md border bg-background px-3 text-sm" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} />
    {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Experience performance summary">
        <AnalyticsMetricCard label="Viewers" value={loading ? "…" : summary.viewers.toLocaleString()} description="Unique users who saw an experience" selected={metric === "viewers"} onClick={() => setMetric("viewers")} />
        <AnalyticsMetricCard label="Engagement rate" value={loading ? "…" : displayRate(summary.engagement)} description="Viewers who interacted" selected={metric === "engagement"} onClick={() => setMetric("engagement")} />
        <AnalyticsMetricCard label="Completion rate" value={loading ? "…" : displayRate(summary.completion)} description="For guides and surveys" selected={metric === "completion"} onClick={() => setMetric("completion")} />
        <AnalyticsMetricCard label="Goal conversion" value="—" description="No configured goal data" selected={metric === "goal"} onClick={() => setMetric("goal")} />
      </section>
      <section aria-labelledby="performance-heading"><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 id="performance-heading" className="text-base font-semibold text-foreground">Performance over time</h2><p className="mt-1 text-sm text-muted-foreground">Daily experience performance for the selected period.</p></div><div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1" role="tablist" aria-label="Performance metric">{(Object.keys(metricLabels) as TrendMetric[]).map(key => <button key={key} type="button" role="tab" aria-selected={metric === key} onClick={() => setMetric(key)} className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors", metric === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{metricLabels[key]}</button>)}</div></div>
        <div className="h-[250px]">{loading ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading performance…</div> : metric === "goal" ? <EmptyChart message="Goal conversion becomes available when experiences have configured goals." /> : trend.some(point => point[metric] !== 0) ? <TrendChart data={trend} metric={metric} /> : <EmptyChart message="No experience activity in this date range." />}</div>
      </section>
      <section aria-labelledby="experiences-heading"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 id="experiences-heading" className="text-base font-semibold text-foreground">Experiences {!loading && <span className="font-normal text-muted-foreground">({items.length})</span>}</h2><p className="mt-1 text-sm text-muted-foreground">Compare performance across individual experiences.</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search experiences" className="h-9 w-48 rounded-md border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20" /></label><select aria-label="Filter experience type" value={type} onChange={event => setType(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All types</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter experience status" value={status} onChange={event => setStatus(event.target.value as StatusFilter)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="published">Live</option><option value="paused">Paused</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div></div>
        <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[720px] text-sm"><thead className="border-b bg-muted/30 text-left text-xs font-medium text-muted-foreground"><tr><th className="px-4 py-3">Experience</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Viewers</th><th className="px-4 py-3 text-right">Engagement</th><th className="px-4 py-3 text-right">Completion</th><th className="px-4 py-3 text-right">Goal</th></tr></thead><tbody>{loading ? <TableMessage colSpan={6} message="Loading experiences…" /> : visibleItems.length ? visibleItems.map(item => <ExperienceRow key={item.experience.id} item={item} status={statusById.get(item.experience.id)} />) : <TableMessage colSpan={6} message={items.length ? "No experiences match these filters." : "No experience analytics in this date range."} />}</tbody></table></div>
      </section>
    </div>}
  </>;
}

function EmptyChart({ message }: { message: string }) { return <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{message}</div>; }
function TableMessage({ colSpan, message }: { colSpan: number; message: string }) { return <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">{message}</td></tr>; }

function TrendChart({ data, metric }: { data: TrendPoint[]; metric: Exclude<TrendMetric, "goal"> }) { const rateMetric = metric !== "viewers"; return <ChartContainer className="h-full" config={{ [metric]: { label: metricLabels[metric], color: "#4f46e5" } }}>{({ width }) => <LineChart data={data} margin={chartMargin}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/70" /><XAxis dataKey="date" tickLine={false} axisLine={false} {...getResponsiveDateAxisProps(data.map(point => point.date), width)} /><YAxis tickLine={false} axisLine={false} tick={chartAxisTick} tickMargin={8} width={40} tickFormatter={value => rateMetric ? `${value}%` : Number(value).toLocaleString()} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey={metric} stroke="#4f46e5" strokeWidth={2.25} dot={false} activeDot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }} /></LineChart>}</ChartContainer>; }
function ExperienceRow({ item, status }: { item: ExperienceAnalytics; status?: Experience["status"] }) { const statusLabel = status === "published" ? "Live" : status ? status[0].toUpperCase() + status.slice(1) : "—"; return <tr className="border-b last:border-0 transition-colors hover:bg-muted/30"><td className="px-4 py-3"><Link to={`/experiences/${item.experience.id}/edit`} className="block rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block font-medium text-foreground">{item.experience.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{labelFor(item)}</span></Link></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><i className={cn("size-1.5 rounded-full", status === "published" ? "bg-emerald-500" : status === "paused" ? "bg-amber-500" : "bg-muted-foreground/60")} />{statusLabel}</span></td><td className="px-4 py-3 text-right font-mono text-foreground">{item.summary.usersSeen.toLocaleString()}</td><td className="px-4 py-3 text-right font-mono text-foreground">{displayRate(engagementFor(item))}</td><td className="px-4 py-3 text-right font-mono text-foreground">{displayRate(completionFor(item))}</td><td className="px-4 py-3 text-right font-mono text-muted-foreground">—</td></tr>; }
function buildTrend(items: ExperienceAnalytics[], days: number): TrendPoint[] {
  const byDate = new Map<string, { viewers: number; interactions: number; completed: number; completionViewers: number }>();
  for (const item of items) for (const point of item.trend) { const row = byDate.get(point.date) ?? { viewers: 0, interactions: 0, completed: 0, completionViewers: 0 }; row.viewers += point.usersSeen; row.completed += item.survey ? point.submitted : point.completed; if (completionFor(item) !== null) row.completionViewers += point.usersSeen; row.interactions += point.interacted; byDate.set(point.date, row); }
  const until = new Date(); const start = new Date(until.getTime() - (days - 1) * DAY); const values: TrendPoint[] = [];
  for (let time = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()); time <= Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate()); time += DAY) { const date = new Date(time).toISOString().slice(0, 10); const row = byDate.get(date) ?? { viewers: 0, interactions: 0, completed: 0, completionViewers: 0 }; values.push({ date, viewers: row.viewers, engagement: percent(row.interactions, row.viewers), completion: percent(row.completed, row.completionViewers) }); }
  return values;
}

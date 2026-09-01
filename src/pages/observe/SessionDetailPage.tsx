import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionActivity, SessionActivityEvidence, SessionActivityItem } from "../../types/api";
import { formatDuration, formatTimestamp } from "../../lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableFrame, ErrorNotice, LoadingRows, Metric as SurfaceMetric, MetricGrid } from "@/components/PageSurface";

type FilterKind = "click" | "custom" | "long_hover" | "derived_signal";

const SIGNAL_LABEL: Record<string, string> = {
  element_approach: "Pointer moved toward an interaction position",
  element_leave: "Pointer moved away from an interaction position",
  reversal: "Pointer direction changes",
  hesitation: "Back-and-forth pointer movement near an interaction position",
  dwell: "Pointer samples remained near an interaction position",
  repeated_attention: "Repeated recorded interactions with this element",
};

function target(item: SessionActivityItem): string {
  return item.element?.label ?? item.element?.role ?? item.element?.selector ?? "an unidentified element";
}

function relativeTimestamp(timestamp: string, firstObserved: string): string {
  const elapsed = Math.max(0, Date.parse(timestamp) - Date.parse(firstObserved));
  if (elapsed < 1000) return `+${elapsed}ms`;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `+${minutes}m ${seconds % 60}s` : `+${seconds}s`;
}

function propertyText(properties?: Record<string, unknown>): string {
  if (!properties || Object.keys(properties).length === 0) return "No properties recorded";
  return JSON.stringify(properties, null, 2);
}

function Evidence({ evidence }: { evidence?: SessionActivityEvidence }) {
  if (!evidence) return null;
  const values = [
    evidence.sampleCount != null && `${evidence.sampleCount} pointer samples`,
    evidence.distanceMoved != null && `${Math.round(evidence.distanceMoved)}px recorded path distance`,
    evidence.numberOfDirectionChanges != null && `${evidence.numberOfDirectionChanges} direction changes`,
    evidence.minDistanceToTarget != null && `${Math.round(evidence.minDistanceToTarget)}px nearest recorded proximity`,
    evidence.maxDistanceToTarget != null && `${Math.round(evidence.maxDistanceToTarget)}px furthest recorded proximity`,
    evidence.durationMs != null && `${formatDuration(evidence.durationMs)} evidence span`,
    evidence.sourceEventCount != null && `${evidence.sourceEventCount} best-effort source references`,
  ].filter(Boolean);
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      {values.length > 0 && <div>{values.join(" · ")}</div>}
      <div className="mt-1">Source references cover the compiler's time window and are not exact causal attribution.</div>
    </div>
  );
}

function ActivityRow({ item, firstObserved }: { item: SessionActivityItem; firstObserved: string }) {
  const title = item.kind === "click"
    ? `Clicked ${target(item)}`
    : item.kind === "custom"
      ? item.name ?? "Unnamed application event"
      : item.kind === "long_hover"
        ? `Long hover on ${target(item)} — ${formatDuration(item.durationMs ?? 0)}`
        : SIGNAL_LABEL[item.signalKind ?? ""] ?? "Derived pointer signal";
  const badge = item.kind === "custom" ? "Application event" : item.kind === "long_hover" ? "Long hover" : item.kind === "click" ? "Click" : "Derived signal";

  return (
    <details className="border-t py-3">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2.5">
        <Badge variant={item.kind === "custom" ? "secondary" : "outline"}>{badge}</Badge>
        <span className="min-w-0 flex-1 text-foreground">{title}</span>
        <time className="mono text-xs text-muted-foreground" title={formatTimestamp(item.timestamp)}>{relativeTimestamp(item.timestamp, firstObserved)}</time>
      </summary>
      <div className="pt-2 text-xs text-muted-foreground sm:pl-[92px]">
        <div>Recorded: {formatTimestamp(item.timestamp)}</div>
        {item.estimatedStartTimestamp && <div>Estimated hover start: {formatTimestamp(item.estimatedStartTimestamp)}</div>}
        {item.kind === "long_hover" && <div>Duration was reported after pointer leave and was not visibility-verified.</div>}
        {item.element?.selector && <div className="mono mt-1.5 break-all">Selector: {item.element.selector}</div>}
        {item.kind === "custom" && <pre className="mono mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{propertyText(item.properties)}</pre>}
        {item.kind === "derived_signal" && <Evidence evidence={item.evidence} />}
      </div>
    </details>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <SurfaceMetric label={label} value={children} />;
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionActivity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<Record<FilterKind, boolean>>({ click: true, custom: true, long_hover: true, derived_signal: false });

  useEffect(() => {
    if (!currentOrg || !currentSite || !sessionId) return;
    const controller = new AbortController();
    setSession(null); setNotFound(false); setError(null);
    sessionsApi.getSessionActivity(currentOrg.orgId, currentSite.id, sessionId, controller.signal).then(setSession).catch((err) => {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      if (err?.status === 404) setNotFound(true);
      else setError("Couldn't load this session.");
    });
    return () => controller.abort();
  }, [currentOrg, currentSite, sessionId, reloadKey]);

  const visitorPath = session?.visitor?.type === "identified" ? `/users/${session.visitor.id}` : session?.visitor ? `/users/anonymous/${session.visitor.id}` : null;
  const environment = session?.environment;
  const environmentLabel = environment ? [environment.browserName, environment.browserVersion, environment.osName, environment.deviceType].filter(Boolean).join(" · ") : "Not recorded";

  return (
    <>
      <div className="mb-1"><Link to="/observe/sessions" className="text-[13px] text-muted-foreground hover:text-foreground">← All sessions</Link></div>
      <PageHeader section="Observe" title="Session activity" description={sessionId ? `Recorded evidence for ${sessionId}` : "Recorded session evidence"} />

      {error && <div className="flex items-center gap-3"><div className="flex-1"><ErrorNotice>{error}</ErrorNotice></div><Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button></div>}
      {notFound && <DataTableFrame><EmptyState title="Session not found" description="This session doesn't exist for this site." /></DataTableFrame>}
      {!error && !notFound && session === null && <DataTableFrame><LoadingRows count={6} /></DataTableFrame>}

      {session && (
        <>
          <MetricGrid className="mb-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Visitor">{visitorPath ? <Link to={visitorPath}>{session.visitor?.label}</Link> : "Unresolved"}</Metric>
            <Metric label="Observed duration">{formatDuration(session.observedDurationMs)}</Metric>
            <Metric label="Page visits">{session.counts.pageVisits}</Metric><Metric label="Clicks">{session.counts.clicks}</Metric><Metric label="Application events">{session.counts.customEvents}</Metric>
          </MetricGrid>
          <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            <div><span className="text-muted-foreground">First observed</span><br />{formatTimestamp(session.firstObserved)}</div>
            <div><span className="text-muted-foreground">Last observed</span><br />{formatTimestamp(session.lastObserved)}</div>
            <div><span className="text-muted-foreground">Device and browser</span><br />{environmentLabel}</div>
            <div className="break-all"><span className="text-muted-foreground">Referrer</span><br />{environment?.referrer || "Not recorded"}</div>
            <div className="mono break-all"><span className="text-muted-foreground">Session ID</span><br />{session.sessionId}</div>
            {session.hasReplay && <div><Button size="sm" onClick={() => navigate(`/observe/heatmaps?session=${session.sessionId}`)}>View heatmap →</Button></div>}
          </div>

          <div className="mb-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <strong className="text-[13px]">Show</strong>
              {([['click', 'Clicks'], ['custom', 'Application events'], ['long_hover', 'Long hovers'], ['derived_signal', 'Derived signals']] as [FilterKind, string][]).map(([kind, label]) => (
                <label key={kind} className="inline-flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={filters[kind]} onCheckedChange={(checked) => setFilters((value) => ({ ...value, [kind]: checked === true }))} />{label}</label>
              ))}
            </div>
          </div>

          {session.pages.length === 0 && <div className="card"><EmptyState title="No page activity" description="No page-grouped activity could be built for this session." /></div>}
          {session.pages.map((page, index) => {
            const standardItems = page.items.filter((item) => item.kind !== "derived_signal" && filters[item.kind]);
            const derivedItems = page.items.filter((item) => item.kind === "derived_signal");
            return (
              <section className="mb-3 overflow-hidden rounded-lg border bg-card" key={page.id} aria-labelledby={`page-${index}`}>
                <div className="border-b px-5 py-[18px]">
                  <div className="flex flex-wrap items-center gap-2"><h2 id={`page-${index}`} className="m-0 break-words text-base font-semibold">{page.pageName ?? page.path ?? "Unknown page"}</h2>{page.pageName && page.path && <span className="mono break-all text-xs text-muted-foreground">{page.path}</span>}{page.attribution === "inferred" && <Badge variant="secondary">Inferred legacy attribution</Badge>}{page.attribution === "unknown" && <Badge variant="secondary">Uncertain attribution</Badge>}</div>
                  <div className="mt-[7px] text-[12.5px] text-muted-foreground">{relativeTimestamp(page.firstObserved, session.firstObserved)} to {relativeTimestamp(page.lastObserved, session.firstObserved)} · {page.deepestScrollPercent == null ? "No scroll recorded" : `Deepest recorded scroll: ${page.deepestScrollPercent}%`}</div>
                </div>
                <div className="px-5">
                  {standardItems.map((item) => <ActivityRow key={item.id} item={item} firstObserved={session.firstObserved} />)}
                  {standardItems.length === 0 && !filters.derived_signal && <div className="py-[18px] text-[13px] text-muted-foreground">No activity matches the current filters.</div>}
                  {filters.derived_signal && <details className="border-t py-3.5"><summary className="cursor-pointer text-[13px] font-semibold">Derived pointer signals ({derivedItems.length})</summary><div className="mt-2 text-xs text-muted-foreground">These threshold-qualified summaries are recorded geometry evidence, not proof of intent, frustration, or interest.</div>{derivedItems.map((item) => <ActivityRow key={item.id} item={item} firstObserved={session.firstObserved} />)}{derivedItems.length === 0 && <div className="pt-3 text-[13px] text-muted-foreground">No usable pointer-derived signals were recorded for this page visit.</div>}</details>}
                </div>
              </section>
            );
          })}
          <div className="rounded-lg border bg-card p-4 text-[12.5px] leading-relaxed text-muted-foreground"><strong className="text-foreground">Evidence notes.</strong> {session.limitations.observedDuration} {session.limitations.hover} {session.limitations.pointer} The compact response covers all {session.coverage.rawEventCount} stored events and summarizes {session.coverage.cursorSampleCount} cursor samples without returning individual coordinates.</div>
        </>
      )}
    </>
  );
}

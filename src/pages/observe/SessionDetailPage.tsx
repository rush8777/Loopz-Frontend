import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionActivity, SessionActivityEvidence, SessionActivityItem } from "../../types/api";
import { formatDuration, formatTimestamp } from "../../lib/format";

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
    <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 12.5 }}>
      {values.length > 0 && <div>{values.join(" · ")}</div>}
      <div style={{ marginTop: 4 }}>Source references cover the compiler's time window and are not exact causal attribution.</div>
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
    <details style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
      <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, listStyle: "none" }}>
        <span className={`badge ${item.kind === "custom" ? "badge-observe" : "badge-neutral"}`}>{badge}</span>
        <span style={{ flex: 1, color: "var(--text-primary)" }}>{title}</span>
        <time className="mono" title={formatTimestamp(item.timestamp)} style={{ color: "var(--text-muted)", fontSize: 12 }}>{relativeTimestamp(item.timestamp, firstObserved)}</time>
      </summary>
      <div style={{ padding: "10px 0 0 92px", color: "var(--text-secondary)", fontSize: 12.5 }}>
        <div>Recorded: {formatTimestamp(item.timestamp)}</div>
        {item.estimatedStartTimestamp && <div>Estimated hover start: {formatTimestamp(item.estimatedStartTimestamp)}</div>}
        {item.kind === "long_hover" && <div>Duration was reported after pointer leave and was not visibility-verified.</div>}
        {item.element?.selector && <div className="mono" style={{ marginTop: 6, overflowWrap: "anywhere" }}>Selector: {item.element.selector}</div>}
        {item.kind === "custom" && <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: "8px 0 0", fontSize: 12 }}>{propertyText(item.properties)}</pre>}
        {item.kind === "derived_signal" && <Evidence evidence={item.evidence} />}
      </div>
    </details>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <div className="card card-padded" style={{ minWidth: 130, flex: 1 }}><div style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div><div style={{ marginTop: 6, fontSize: 16, color: "var(--text-primary)" }}>{children}</div></div>;
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
      <div style={{ marginBottom: 4 }}><Link to="/observe/sessions" style={{ fontSize: 13, color: "var(--text-secondary)" }}>← All sessions</Link></div>
      <PageHeader section="Observe" title="Session activity" description={sessionId ? `Recorded evidence for ${sessionId}` : "Recorded session evidence"} />

      {error && <div className="card" style={{ padding: 16 }}><div className="error-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{error}</span><button className="btn btn-sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div></div>}
      {notFound && <div className="card"><EmptyState title="Session not found" description="This session doesn't exist for this site." /></div>}
      {!error && !notFound && session === null && <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>}

      {session && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <Metric label="Visitor">{visitorPath ? <Link to={visitorPath}>{session.visitor?.label}</Link> : "Unresolved"}</Metric>
            <Metric label="Observed duration">{formatDuration(session.observedDurationMs)}</Metric>
            <Metric label="Page visits">{session.counts.pageVisits}</Metric><Metric label="Clicks">{session.counts.clicks}</Metric><Metric label="Application events">{session.counts.customEvents}</Metric>
          </div>
          <div className="card card-padded" style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 13 }}>
            <div><span style={{ color: "var(--text-muted)" }}>First observed</span><br />{formatTimestamp(session.firstObserved)}</div>
            <div><span style={{ color: "var(--text-muted)" }}>Last observed</span><br />{formatTimestamp(session.lastObserved)}</div>
            <div><span style={{ color: "var(--text-muted)" }}>Device and browser</span><br />{environmentLabel}</div>
            <div><span style={{ color: "var(--text-muted)" }}>Referrer</span><br />{environment?.referrer || "Not recorded"}</div>
            <div className="mono"><span style={{ color: "var(--text-muted)" }}>Session ID</span><br />{session.sessionId}</div>
            {session.hasReplay && <div><button className="btn btn-sm" onClick={() => navigate(`/observe/heatmaps?session=${session.sessionId}`)}>View heatmap →</button></div>}
          </div>

          <div className="card card-padded" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <strong style={{ fontSize: 13 }}>Show</strong>
              {([['click', 'Clicks'], ['custom', 'Application events'], ['long_hover', 'Long hovers'], ['derived_signal', 'Derived signals']] as [FilterKind, string][]).map(([kind, label]) => (
                <label key={kind} style={{ display: "inline-flex", gap: 7, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={filters[kind]} onChange={(event) => setFilters((value) => ({ ...value, [kind]: event.target.checked }))} />{label}</label>
              ))}
            </div>
          </div>

          {session.pages.length === 0 && <div className="card"><EmptyState title="No page activity" description="No page-grouped activity could be built for this session." /></div>}
          {session.pages.map((page, index) => {
            const standardItems = page.items.filter((item) => item.kind !== "derived_signal" && filters[item.kind]);
            const derivedItems = page.items.filter((item) => item.kind === "derived_signal");
            return (
              <section className="card" key={page.id} style={{ marginBottom: 12 }} aria-labelledby={`page-${index}`}>
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><h2 id={`page-${index}`} style={{ margin: 0, fontSize: 16 }}>{page.pageName ?? page.path ?? "Unknown page"}</h2>{page.pageName && page.path && <span className="mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>{page.path}</span>}{page.attribution === "inferred" && <span className="badge badge-neutral">Inferred legacy attribution</span>}{page.attribution === "unknown" && <span className="badge badge-neutral">Uncertain attribution</span>}</div>
                  <div style={{ marginTop: 7, color: "var(--text-secondary)", fontSize: 12.5 }}>{relativeTimestamp(page.firstObserved, session.firstObserved)} to {relativeTimestamp(page.lastObserved, session.firstObserved)} · {page.deepestScrollPercent == null ? "No scroll recorded" : `Deepest recorded scroll: ${page.deepestScrollPercent}%`}</div>
                </div>
                <div style={{ padding: "0 20px" }}>
                  {standardItems.map((item) => <ActivityRow key={item.id} item={item} firstObserved={session.firstObserved} />)}
                  {standardItems.length === 0 && !filters.derived_signal && <div style={{ padding: "18px 0", color: "var(--text-muted)", fontSize: 13 }}>No activity matches the current filters.</div>}
                  {filters.derived_signal && <details style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}><summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Derived pointer signals ({derivedItems.length})</summary><div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>These threshold-qualified summaries are recorded geometry evidence, not proof of intent, frustration, or interest.</div>{derivedItems.map((item) => <ActivityRow key={item.id} item={item} firstObserved={session.firstObserved} />)}{derivedItems.length === 0 && <div style={{ paddingTop: 12, color: "var(--text-muted)", fontSize: 13 }}>No usable pointer-derived signals were recorded for this page visit.</div>}</details>}
                </div>
              </section>
            );
          })}
          <div className="card card-padded" style={{ color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.6 }}><strong style={{ color: "var(--text-secondary)" }}>Evidence notes.</strong> {session.limitations.observedDuration} {session.limitations.hover} {session.limitations.pointer} The compact response covers all {session.coverage.rawEventCount} stored events and summarizes {session.coverage.cursorSampleCount} cursor samples without returning individual coordinates.</div>
        </>
      )}
    </>
  );
}

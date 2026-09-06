import { Link } from "react-router-dom";
import type { SessionActivity } from "../../../types/api";
import { formatDuration, formatTimestamp } from "../../../lib/format";
import { Button } from "@/components/ui/button";
import { Metric as SurfaceMetric, MetricGrid } from "@/components/PageSurface";

export function SessionSummary({ session, visitorPath, onViewHeatmap }: { session: SessionActivity; visitorPath: string | null; onViewHeatmap: () => void }) {
  const environmentLabel = session.environment ? [session.environment.browserName, session.environment.browserVersion, session.environment.osName, session.environment.deviceType].filter(Boolean).join(" · ") : "Not recorded";
  return <section className="mb-4 overflow-hidden rounded-lg border bg-card" aria-label="Session summary">
    <MetricGrid className="rounded-none border-0 sm:grid-cols-2 lg:grid-cols-5">
      <SurfaceMetric label="Visitor" labelClassName="text-center" value={visitorPath ? <Link to={visitorPath} className="hover:underline">{session.visitor?.label}</Link> : "Unresolved"} />
      <SurfaceMetric label="Observed duration" labelClassName="text-center" value={formatDuration(session.observedDurationMs)} />
      <SurfaceMetric label="Page visits" value={session.counts.pageVisits} />
      <SurfaceMetric label="Clicks" value={session.counts.clicks} />
      <SurfaceMetric label="Application events" value={session.counts.customEvents} />
    </MetricGrid>
    <div className="grid gap-x-6 gap-y-3 border-t px-4 py-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
      <Detail label="First observed">{formatTimestamp(session.firstObserved)}</Detail><Detail label="Last observed">{formatTimestamp(session.lastObserved)}</Detail><Detail label="Device and browser">{environmentLabel}</Detail>
      <Detail label="Referrer"><span className="break-all">{session.environment?.referrer || "Not recorded"}</span></Detail><Detail label="Session ID"><span className="mono break-all">{session.sessionId}</span></Detail>
      {session.hasReplay && <div className="flex items-end"><Button variant="outline" size="sm" onClick={onViewHeatmap}>View heatmap →</Button></div>}
    </div>
  </section>;
}
function Detail({ label, children }: { label: string; children: React.ReactNode }) { return <div><div className="mb-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{label}</div><div>{children}</div></div>; }

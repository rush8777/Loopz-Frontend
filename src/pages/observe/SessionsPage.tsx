import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionSummary } from "../../types/api";
import { formatDuration, formatRelativeTime } from "../../lib/format";

export function SessionsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    let current = true;
    setSessions(null);
    setError(null);
    sessionsApi.listSessions(currentOrg.orgId, currentSite.id, { limit: 100 }).then((res) => {
      if (current) setSessions(res.sessions);
    }).catch(() => {
      if (current) setError("Couldn't load sessions.");
    });
    return () => { current = false; };
  }, [currentOrg, currentSite, reloadKey]);

  if (!currentSite) {
    return <><PageHeader section="Observe" title="Sessions" description="Every captured visitor session for this site." /><div className="card"><EmptyState title="No site selected" description="Create or select a site from the switcher above to see its sessions." /></div></>;
  }

  return (
    <>
      <PageHeader section="Observe" title="Sessions" description={`Recorded session activity on ${currentSite.name}.`} />
      <div className="card">
        {error && <div style={{ padding: 16 }}><div className="error-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{error}</span><button className="btn btn-sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div></div>}
        {!error && sessions === null && <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>}
        {sessions && sessions.length === 0 && <EmptyState title="No sessions yet" description={<>Once the SDK sends events for this site to <code>/public/sites/{currentSite.siteId}/events</code>, sessions will appear here.</>} />}
        {sessions && sessions.length > 0 && (
          <div style={{ overflowX: "auto" }}><table className="table">
            <thead><tr><th>Visitor</th><th>Started</th><th>Observed duration</th><th>Pages</th><th>Clicks</th><th>Application events</th><th>Last observed</th></tr></thead>
            <tbody>{sessions.map((session) => (
              <tr key={session.sessionId} tabIndex={0} onClick={() => navigate(`/observe/sessions/${session.sessionId}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/observe/sessions/${session.sessionId}`); }} aria-label={`Open session ${session.sessionId}`}>
                <td style={{ color: "var(--text-primary)" }}>{session.visitor?.label ?? "Unresolved visitor"}</td>
                <td style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(session.firstSeen)}</td>
                <td className="mono">{formatDuration(session.durationMs)}</td><td className="mono">{session.pageVisitCount ?? 0}</td><td className="mono">{session.clickCount ?? 0}</td><td className="mono">{session.customEventCount ?? 0}</td>
                <td style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(session.lastSeen)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

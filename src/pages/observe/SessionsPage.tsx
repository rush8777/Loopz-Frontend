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

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setSessions(null);
    setError(null);
    sessionsApi
      .listSessions(currentOrg.orgId, currentSite.id, { limit: 100 })
      .then((res) => setSessions(res.sessions))
      .catch(() => setError("Couldn't load sessions."));
  }, [currentOrg, currentSite]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Sessions" description="Every captured visitor session for this site." />
        <div className="card">
          <EmptyState
            title="No site selected"
            description="Create or select a site from the switcher above to see its sessions."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title="Sessions"
        description={`Every captured visitor session on ${currentSite.name}.`}
      />

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && sessions === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        )}

        {sessions && sessions.length === 0 && (
          <EmptyState
            title="No sessions yet"
            description={
              <>
                Once the SDK sends events for this site to{" "}
                <code>/public/sites/{currentSite.siteId}/events</code>, sessions will appear here.
              </>
            }
          />
        )}

        {sessions && sessions.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Events</th>
                <th>Duration</th>
                <th>Last active</th>
                <th>Replay</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.sessionId} onClick={() => navigate(`/observe/sessions/${s.sessionId}`)}>
                  <td className="mono" style={{ color: "var(--text-primary)" }}>
                    {s.sessionId}
                  </td>
                  <td className="mono">{s.eventCount}</td>
                  <td className="mono">{formatDuration(s.durationMs)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(s.lastSeen)}</td>
                  <td>
                    {s.hasReplay ? (
                      <span className="badge badge-observe">
                        <span className="badge-dot" /> Available
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

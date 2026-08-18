import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionDetail } from "../../types/api";
import { formatTimestamp } from "../../lib/format";

const EVENT_LABEL: Record<string, string> = {
  page_view: "Page view",
  hover: "Hover",
  click: "Click",
  scroll: "Scroll",
  // cursor: "Cursor",
};

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite || !sessionId) return;
    setSession(null);
    setNotFound(false);
    setError(null);
    sessionsApi
      .getSession(currentOrg.orgId, currentSite.id, sessionId)
      .then(setSession)
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        else setError("Couldn't load this session.");
      });
  }, [currentOrg, currentSite, sessionId]);

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <Link to="/observe/sessions" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          ← All sessions
        </Link>
      </div>
      <PageHeader section="Observe" title={sessionId ?? ""} description="Ordered event timeline for this session." />

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}
        {notFound && <EmptyState title="Session not found" description="This session doesn't exist for this site." />}
        {!error && !notFound && session === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36 }} />
            ))}
          </div>
        )}

        {session && (
          <div style={{ padding: "8px 0" }}>
            {session.hasReplay && (
              <div style={{ padding: "12px 20px" }}>
                <button className="btn btn-sm" onClick={() => navigate(`/observe/heatmaps?session=${session.sessionId}`)}>
                  View heatmap for this session →
                </button>
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Detail</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {session.events
                  .filter((e) => e.type !== "cursor")
                  .map((e, i) => (
                    <tr key={i} style={{ cursor: "default" }}>
                      <td>
                        <span className="badge badge-neutral">{EVENT_LABEL[e.type] ?? e.type}</span>
                      </td>
                      <td className="mono" style={{ color: "var(--text-secondary)" }}>
                        {e.selector ?? "—"}
                      </td>
                      <td className="mono" style={{ color: "var(--text-secondary)" }}>
                        {e.durationMs != null ? `${e.durationMs}ms` : null}
                        {e.scrollPercent != null ? `${e.scrollPercent}%` : null}
                        {e.durationMs == null && e.scrollPercent == null ? "—" : null}
                      </td>
                      <td className="mono" style={{ color: "var(--text-muted)" }}>
                        {formatTimestamp(e.timestamp)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as anonymousUsersApi from "../../api/anonymousUsers";
import type { AnonymousVisitorDetail, UserActivityItem, SessionSummary } from "../../types/api";
import { formatDuration, formatRelativeTime, formatTimestamp, formatDeviceLabel } from "../../lib/format";
import { EnvironmentBlock } from "./UserProfilePage";

type Tab = "overview" | "activity" | "sessions";
const PAGE_SIZE = 25;

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={active ? "btn btn-sm" : "btn btn-ghost btn-sm"}
      style={active ? { background: "var(--users-dim)", color: "var(--users)", borderColor: "transparent" } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Profile for one still-anonymous visitor (task brief section 8) -
 * intentionally a near-twin of UserProfilePage, reusing the same tab
 * shell and the same activity/session shapes the identified profile
 * uses (both come from the same backend read model). The differences
 * are exactly the identity ones: no Properties tab (an anonymous
 * visitor has none, by definition - section 9), and a redirect if
 * identify() has since resolved this anonymousId to a real user
 * (section 17: it's no longer an independent identity once claimed).
 */
export function AnonymousVisitorPage() {
  const { anonymousId } = useParams<{ anonymousId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();

  const [visitor, setVisitor] = useState<Extract<AnonymousVisitorDetail, { identityType: "anonymous" }> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [activity, setActivity] = useState<UserActivityItem[] | null>(null);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [sessionsTotal, setSessionsTotal] = useState(0);

  useEffect(() => {
    if (!currentOrg || !currentSite || !anonymousId) return;
    setVisitor(null);
    setNotFound(false);
    setError(null);
    anonymousUsersApi
      .getAnonymousVisitor(currentOrg.orgId, currentSite.id, anonymousId)
      .then((res) => {
        if (res.identityType === "identified") {
          // identify() has since claimed this anonymousId - it belongs on the identified profile now, not here.
          navigate(`/users/${res.resolvedTo.trackedUserId}`, { replace: true });
          return;
        }
        setVisitor(res);
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        else setError("Couldn't load this visitor.");
      });
  }, [currentOrg, currentSite, anonymousId, navigate]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !anonymousId || tab !== "activity") return;
    setActivity(null);
    anonymousUsersApi
      .getAnonymousVisitorActivity(currentOrg.orgId, currentSite.id, anonymousId, { limit: PAGE_SIZE, offset: activityOffset })
      .then((res) => {
        setActivity(res.activities);
        setActivityTotal(res.total);
      })
      .catch(() => setError("Couldn't load activity."));
  }, [currentOrg, currentSite, anonymousId, tab, activityOffset]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !anonymousId || tab !== "sessions") return;
    setSessions(null);
    anonymousUsersApi
      .getAnonymousVisitorSessions(currentOrg.orgId, currentSite.id, anonymousId, { limit: PAGE_SIZE, offset: sessionsOffset })
      .then((res) => {
        setSessions(res.sessions);
        setSessionsTotal(res.total);
      })
      .catch(() => setError("Couldn't load sessions."));
  }, [currentOrg, currentSite, anonymousId, tab, sessionsOffset]);

  if (notFound) {
    return (
      <>
        <PageHeader section="Users" title="Visitor not found" />
        <div className="card">
          <EmptyState
            title="No such visitor"
            description="This anonymous id hasn't been seen on this site."
            action={
              <Link to="/users" className="btn btn-sm">
                Back to Users
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <Link to="/users" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          ← All users
        </Link>
      </div>
      <PageHeader
        section="Users"
        title={visitor ? "Anonymous visitor" : ""}
        description={visitor ? visitor.anonymousId : undefined}
      />

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="error-banner">{error}</div>
        </div>
      )}

      {!error && !visitor && (
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44 }} />
          ))}
        </div>
      )}

      {visitor && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
              Activity
            </TabButton>
            <TabButton active={tab === "sessions"} onClick={() => setTab("sessions")}>
              Sessions
            </TabButton>
          </div>

          {tab === "overview" && (
            <div className="card card-padded">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 20,
                  marginBottom: 20,
                }}
              >
                <StatBlock label="First seen" value={visitor.stats.firstSeenAt ? formatRelativeTime(visitor.stats.firstSeenAt) : "—"} />
                <StatBlock label="Last seen" value={visitor.stats.lastSeenAt ? formatRelativeTime(visitor.stats.lastSeenAt) : "—"} />
                <StatBlock label="Sessions" value={String(visitor.stats.sessionCount)} />
                <StatBlock label="Page views" value={String(visitor.stats.pageViewCount)} />
                <StatBlock label="Events" value={String(visitor.stats.eventCount)} />
                <StatBlock label="Active time" value={formatDuration(visitor.stats.totalActiveTimeMs)} />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 20,
                  paddingTop: 20,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <StatBlock label="First page" value={visitor.stats.firstPage ?? "—"} />
                <StatBlock label="Last page" value={visitor.stats.lastPage ?? "—"} />
              </div>
              <div style={{ paddingTop: 20, marginTop: 20, borderTop: "1px solid var(--border)" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 14,
                  }}
                >
                  Environment (most recent session)
                </div>
                <EnvironmentBlock environment={visitor.environment} />
              </div>
              <p style={{ marginTop: 20, fontSize: 12.5, color: "var(--text-muted)" }}>
                No identity properties yet - this visitor hasn't been identified via <code>analytics.identify()</code>.
              </p>
            </div>
          )}

          {tab === "activity" && (
            <div className="card">
              {activity === null && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 36 }} />
                  ))}
                </div>
              )}
              {activity && activity.length === 0 && (
                <EmptyState title="No activity yet" description="Nothing has been recorded for this visitor." />
              )}
              {activity && activity.length > 0 && (
                <>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 16,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13.5 }}>{item.title}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {item.sessionId}
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {activityTotal > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={activityOffset === 0}
                        onClick={() => setActivityOffset(Math.max(0, activityOffset - PAGE_SIZE))}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={activityOffset + PAGE_SIZE >= activityTotal}
                        onClick={() => setActivityOffset(activityOffset + PAGE_SIZE)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "sessions" && (
            <div className="card">
              {sessions === null && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 40 }} />
                  ))}
                </div>
              )}
              {sessions && sessions.length === 0 && (
                <EmptyState title="No sessions yet" description="This visitor has no recorded sessions." />
              )}
              {sessions && sessions.length > 0 && (
                <>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Device</th>
                        <th>Events</th>
                        <th>Duration</th>
                        <th>Last seen</th>
                        <th>Replay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.sessionId} onClick={() => navigate(`/observe/sessions/${s.sessionId}`)}>
                          <td className="mono">{s.sessionId}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{formatDeviceLabel(s)}</td>
                          <td className="mono">{s.eventCount}</td>
                          <td className="mono">{formatDuration(s.durationMs)}</td>
                          <td className="mono" style={{ color: "var(--text-secondary)" }}>
                            {formatRelativeTime(s.lastSeen)}
                          </td>
                          <td>{s.hasReplay ? <span className="badge badge-observe">available</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sessionsTotal > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={sessionsOffset === 0}
                        onClick={() => setSessionsOffset(Math.max(0, sessionsOffset - PAGE_SIZE))}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={sessionsOffset + PAGE_SIZE >= sessionsTotal}
                        onClick={() => setSessionsOffset(sessionsOffset + PAGE_SIZE)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

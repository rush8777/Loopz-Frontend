import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as trackedUsersApi from "../../api/trackedUsers";
import type { TrackedUserDetail, UserActivityItem, SessionSummary, EnvironmentContext } from "../../types/api";
import { formatDuration, formatRelativeTime, formatTimestamp, formatDeviceLabel } from "../../lib/format";

type Tab = "overview" | "activity" | "properties" | "sessions";
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

/** Device/Browser/OS/Language/Timezone/Screen/Referrer block, shared between the identified and anonymous profile pages - both surface the same environment shape from the visitor's most recent session. */
export function EnvironmentBlock({ environment }: { environment: EnvironmentContext | null }) {
  if (!environment) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        No environment data yet - it's captured automatically at the start of a session, so this fills in once
        they've had at least one.
      </p>
    );
  }

  const browser = environment.browserName
    ? `${environment.browserName}${environment.browserVersion ? ` ${environment.browserVersion}` : ""}`
    : "—";
  const os = environment.osName ? `${environment.osName}${environment.osVersion ? ` ${environment.osVersion}` : ""}` : "—";
  const screen =
    environment.screenWidth && environment.screenHeight ? `${environment.screenWidth}×${environment.screenHeight}` : "—";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 20 }}>
      <StatBlock label="Device" value={environment.deviceType ?? "—"} />
      <StatBlock label="Browser" value={browser} />
      <StatBlock label="OS" value={os} />
      <StatBlock label="Language" value={environment.language ?? "—"} />
      <StatBlock label="Timezone" value={environment.timezone ?? "—"} />
      <StatBlock label="Screen" value={screen} />
      <StatBlock label="Referrer" value={environment.referrer ?? "Direct / none"} />
    </div>
  );
}

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();

  const [user, setUser] = useState<TrackedUserDetail | null>(null);
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
    if (!currentOrg || !currentSite || !userId) return;
    setUser(null);
    setNotFound(false);
    setError(null);
    trackedUsersApi
      .getUser(currentOrg.orgId, currentSite.id, userId)
      .then(setUser)
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        else setError("Couldn't load this user.");
      });
  }, [currentOrg, currentSite, userId]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !userId || tab !== "activity") return;
    setActivity(null);
    trackedUsersApi
      .getUserActivity(currentOrg.orgId, currentSite.id, userId, { limit: PAGE_SIZE, offset: activityOffset })
      .then((res) => {
        setActivity(res.activities);
        setActivityTotal(res.total);
      })
      .catch(() => setError("Couldn't load activity."));
  }, [currentOrg, currentSite, userId, tab, activityOffset]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !userId || tab !== "sessions") return;
    setSessions(null);
    trackedUsersApi
      .getUserSessions(currentOrg.orgId, currentSite.id, userId, { limit: PAGE_SIZE, offset: sessionsOffset })
      .then((res) => {
        setSessions(res.sessions);
        setSessionsTotal(res.total);
      })
      .catch(() => setError("Couldn't load sessions."));
  }, [currentOrg, currentSite, userId, tab, sessionsOffset]);

  if (notFound) {
    return (
      <>
        <PageHeader section="Users" title="User not found" />
        <div className="card">
          <EmptyState
            title="No such user"
            description="This user doesn't exist, or belongs to a different site."
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

  const displayName =
    (user?.properties.find((p) => p.name === "name")?.value as string | undefined) ?? user?.externalUserId ?? "";

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <Link to="/users" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          ← All users
        </Link>
      </div>
      <PageHeader section="Users" title={user ? displayName : ""} description={user ? user.externalUserId : undefined} />

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="error-banner">{error}</div>
        </div>
      )}

      {!error && !user && (
        <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44 }} />
          ))}
        </div>
      )}

      {user && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
              Activity
            </TabButton>
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")}>
              Properties
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
                <StatBlock label="First seen" value={user.stats.firstSeenAt ? formatRelativeTime(user.stats.firstSeenAt) : "—"} />
                <StatBlock label="Last seen" value={user.stats.lastSeenAt ? formatRelativeTime(user.stats.lastSeenAt) : "—"} />
                <StatBlock label="Sessions" value={String(user.stats.sessionCount)} />
                <StatBlock label="Page views" value={String(user.stats.pageViewCount)} />
                <StatBlock label="Events" value={String(user.stats.eventCount)} />
                <StatBlock label="Active time" value={formatDuration(user.stats.totalActiveTimeMs)} />
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
                <StatBlock label="First page" value={user.stats.firstPage ?? "—"} />
                <StatBlock label="Last page" value={user.stats.lastPage ?? "—"} />
                <StatBlock label="Identified" value={formatRelativeTime(user.firstIdentifiedAt)} />
                <StatBlock label="Anonymous IDs merged" value={String(user.anonymousIds.length)} />
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
                <EnvironmentBlock environment={user.environment} />
              </div>
            </div>
          )}

          {tab === "properties" && (
            <div className="card">
              {user.properties.length === 0 ? (
                <EmptyState title="No properties" description="No attributes have been passed via identify() yet." />
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                      <th>First seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.properties.map((p) => (
                      <tr key={p.name} style={{ cursor: "default" }}>
                        <td className="mono" style={{ color: "var(--text-secondary)" }}>
                          {p.name}
                        </td>
                        <td>{p.valueType === "object" ? JSON.stringify(p.value) : String(p.value)}</td>
                        <td className="mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {formatRelativeTime(p.firstSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 10,
                  }}
                >
                  Automatically detected
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
                  <StatBlock label="First seen" value={user.stats.firstSeenAt ? formatRelativeTime(user.stats.firstSeenAt) : "—"} />
                  <StatBlock label="Last seen" value={user.stats.lastSeenAt ? formatRelativeTime(user.stats.lastSeenAt) : "—"} />
                  <StatBlock label="Sessions" value={String(user.stats.sessionCount)} />
                  <StatBlock label="Page views" value={String(user.stats.pageViewCount)} />
                </div>
              </div>
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
                <EmptyState title="No activity yet" description="Nothing has been recorded for this user." />
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
                <EmptyState title="No sessions yet" description="This user has no recorded sessions." />
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

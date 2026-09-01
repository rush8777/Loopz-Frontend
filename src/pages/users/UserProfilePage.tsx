import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as trackedUsersApi from "../../api/trackedUsers";
import type { TrackedUserDetail, UserActivityItem, SessionSummary, EnvironmentContext } from "../../types/api";
import { formatDuration, formatRelativeTime, formatTimestamp, formatDeviceLabel } from "../../lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTableFrame, ErrorNotice, LoadingRows, Metric, MetricGrid, dataTableClass } from "@/components/PageSurface";
import { cn } from "@/lib/utils";

type Tab = "overview" | "activity" | "properties" | "sessions";
const PAGE_SIZE = 25;

function StatBlock({ label, value }: { label: string; value: string }) {
  return <Metric label={label} value={value} />;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button type="button" variant="ghost" size="sm"
      onClick={onClick}
      className={cn("rounded-b-none border-b-2 border-transparent text-muted-foreground", active && "border-primary font-semibold text-foreground")}
    >
      {children}
    </Button>
  );
}

/** Device/Browser/OS/Language/Timezone/Screen/Referrer block, shared between the identified and anonymous profile pages - both surface the same environment shape from the visitor's most recent session. */
export function EnvironmentBlock({ environment }: { environment: EnvironmentContext | null }) {
  if (!environment) {
    return (
      <p className="text-xs text-muted-foreground">
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
    <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mb-1">
        <Link to="/users" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← All users
        </Link>
      </div>
      <PageHeader section="Users" title={user ? displayName : ""} description={user ? user.externalUserId : undefined} />

      {error && (
        <div className="mb-4"><ErrorNotice>{error}</ErrorNotice></div>
      )}

      {!error && !user && (
        <DataTableFrame><LoadingRows count={4} /></DataTableFrame>
      )}

      {user && (
        <>
          <div className="mb-4 flex gap-1 overflow-x-auto border-b">
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
            <div className="space-y-5 rounded-lg border bg-card p-5">
              <MetricGrid className="lg:grid-cols-3">
                <StatBlock label="First seen" value={user.stats.firstSeenAt ? formatRelativeTime(user.stats.firstSeenAt) : "—"} />
                <StatBlock label="Last seen" value={user.stats.lastSeenAt ? formatRelativeTime(user.stats.lastSeenAt) : "—"} />
                <StatBlock label="Sessions" value={String(user.stats.sessionCount)} />
                <StatBlock label="Page views" value={String(user.stats.pageViewCount)} />
                <StatBlock label="Events" value={String(user.stats.eventCount)} />
                <StatBlock label="Active time" value={formatDuration(user.stats.totalActiveTimeMs)} />
              </MetricGrid>
              <MetricGrid>
                <StatBlock label="First page" value={user.stats.firstPage ?? "—"} />
                <StatBlock label="Last page" value={user.stats.lastPage ?? "—"} />
                <StatBlock label="Identified" value={formatRelativeTime(user.firstIdentifiedAt)} />
                <StatBlock label="Anonymous IDs merged" value={String(user.anonymousIds.length)} />
              </MetricGrid>
              <div className="border-t pt-5">
                <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Environment (most recent session)
                </div>
                <EnvironmentBlock environment={user.environment} />
              </div>
            </div>
          )}

          {tab === "properties" && (
            <DataTableFrame>
              {user.properties.length === 0 ? (
                <EmptyState title="No properties" description="No attributes have been passed via identify() yet." />
              ) : (
                <table className={dataTableClass}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                      <th>First seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.properties.map((p) => (
                      <tr key={p.name} className="cursor-default">
                        <td className="mono text-muted-foreground">
                          {p.name}
                        </td>
                        <td className="max-w-[520px] break-words">{p.valueType === "object" ? JSON.stringify(p.value) : String(p.value)}</td>
                        <td className="mono text-xs text-muted-foreground">
                          {formatRelativeTime(p.firstSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="border-t p-4">
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Automatically detected
                </div>
                <MetricGrid>
                  <StatBlock label="First seen" value={user.stats.firstSeenAt ? formatRelativeTime(user.stats.firstSeenAt) : "—"} />
                  <StatBlock label="Last seen" value={user.stats.lastSeenAt ? formatRelativeTime(user.stats.lastSeenAt) : "—"} />
                  <StatBlock label="Sessions" value={String(user.stats.sessionCount)} />
                  <StatBlock label="Page views" value={String(user.stats.pageViewCount)} />
                </MetricGrid>
              </div>
            </DataTableFrame>
          )}

          {tab === "activity" && (
            <DataTableFrame>
              {activity === null && (
                <LoadingRows count={6} />
              )}
              {activity && activity.length === 0 && (
                <EmptyState title="No activity yet" description="Nothing has been recorded for this user." />
              )}
              {activity && activity.length > 0 && (
                <>
                  <div className="flex flex-col">
                    {activity.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-4 border-b px-4 py-3 last:border-b-0"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {item.type === "custom" && (
                              // Distinct visual treatment, same principle as
                              // the session timeline - a business event
                              // must never blend in with autocapture rows.
                              <Badge>
                                Custom
                              </Badge>
                            )}
                            <div className="text-[13.5px]">{item.title}</div>
                          </div>
                          {item.type === "custom" && item.metadata.eventProperties && Object.keys(item.metadata.eventProperties).length > 0 && (
                            <div className="mono mt-1 break-words text-[11.5px] text-muted-foreground">
                              {Object.entries(item.metadata.eventProperties)
                                .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
                                .join(", ")}
                            </div>
                          )}
                          <div className="mono mt-0.5 break-all text-[11px] text-muted-foreground">
                            {item.sessionId}
                          </div>
                        </div>
                        <div className="mono whitespace-nowrap text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {activityTotal > PAGE_SIZE && (
                    <div className="flex justify-end gap-2 border-t px-4 py-3">
                      <Button variant="ghost" size="sm"
                        disabled={activityOffset === 0}
                        onClick={() => setActivityOffset(Math.max(0, activityOffset - PAGE_SIZE))}
                      >
                        Previous
                      </Button>
                      <Button variant="ghost" size="sm"
                        disabled={activityOffset + PAGE_SIZE >= activityTotal}
                        onClick={() => setActivityOffset(activityOffset + PAGE_SIZE)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </DataTableFrame>
          )}

          {tab === "sessions" && (
            <DataTableFrame>
              {sessions === null && (
                <LoadingRows count={4} />
              )}
              {sessions && sessions.length === 0 && (
                <EmptyState title="No sessions yet" description="This user has no recorded sessions." />
              )}
              {sessions && sessions.length > 0 && (
                <>
                  <table className={dataTableClass}>
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
                          <td className="text-muted-foreground">{formatDeviceLabel(s)}</td>
                          <td className="mono">{s.eventCount}</td>
                          <td className="mono">{formatDuration(s.durationMs)}</td>
                          <td className="mono text-muted-foreground">
                            {formatRelativeTime(s.lastSeen)}
                          </td>
                          <td>{s.hasReplay ? <span className="badge badge-observe">available</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sessionsTotal > PAGE_SIZE && (
                    <div className="flex justify-end gap-2 border-t px-4 py-3">
                      <Button variant="ghost" size="sm"
                        disabled={sessionsOffset === 0}
                        onClick={() => setSessionsOffset(Math.max(0, sessionsOffset - PAGE_SIZE))}
                      >
                        Previous
                      </Button>
                      <Button variant="ghost" size="sm"
                        disabled={sessionsOffset + PAGE_SIZE >= sessionsTotal}
                        onClick={() => setSessionsOffset(sessionsOffset + PAGE_SIZE)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </DataTableFrame>
          )}
        </>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as anonymousUsersApi from "../../api/anonymousUsers";
import type { AnonymousVisitorDetail, UserActivityItem, SessionSummary } from "../../types/api";
import { formatDuration, formatRelativeTime, formatTimestamp, formatDeviceLabel } from "../../lib/format";
import { EnvironmentBlock } from "./UserProfilePage";
import { Button } from "@/components/ui/button";
import { DataTableFrame, ErrorNotice, LoadingRows, Metric, MetricGrid, dataTableClass } from "@/components/PageSurface";
import { cn } from "@/lib/utils";

type Tab = "overview" | "activity" | "sessions";
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
      <div className="mb-1">
        <Link to="/users" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← All users
        </Link>
      </div>
      <PageHeader
        section="Users"
        title={visitor ? "Anonymous visitor" : ""}
        description={visitor ? visitor.anonymousId : undefined}
      />

      {error && (
        <div className="mb-4"><ErrorNotice>{error}</ErrorNotice></div>
      )}

      {!error && !visitor && (
        <DataTableFrame><LoadingRows count={4} /></DataTableFrame>
      )}

      {visitor && (
        <>
          <div className="mb-4 flex gap-1 overflow-x-auto border-b">
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
            <div className="space-y-5 rounded-lg border bg-card p-5">
              <MetricGrid className="lg:grid-cols-3">
                <StatBlock label="First seen" value={visitor.stats.firstSeenAt ? formatRelativeTime(visitor.stats.firstSeenAt) : "—"} />
                <StatBlock label="Last seen" value={visitor.stats.lastSeenAt ? formatRelativeTime(visitor.stats.lastSeenAt) : "—"} />
                <StatBlock label="Sessions" value={String(visitor.stats.sessionCount)} />
                <StatBlock label="Page views" value={String(visitor.stats.pageViewCount)} />
                <StatBlock label="Events" value={String(visitor.stats.eventCount)} />
                <StatBlock label="Active time" value={formatDuration(visitor.stats.totalActiveTimeMs)} />
              </MetricGrid>
              <MetricGrid>
                <StatBlock label="First page" value={visitor.stats.firstPage ?? "—"} />
                <StatBlock label="Last page" value={visitor.stats.lastPage ?? "—"} />
              </MetricGrid>
              <div className="border-t pt-5">
                <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Environment (most recent session)
                </div>
                <EnvironmentBlock environment={visitor.environment} />
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                No identity properties yet - this visitor hasn't been identified via <code>analytics.identify()</code>.
              </p>
            </div>
          )}

          {tab === "activity" && (
            <DataTableFrame>
              {activity === null && (
                <LoadingRows count={6} />
              )}
              {activity && activity.length === 0 && (
                <EmptyState title="No activity yet" description="Nothing has been recorded for this visitor." />
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
                          <div className="text-[13.5px]">{item.title}</div>
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
                <EmptyState title="No sessions yet" description="This visitor has no recorded sessions." />
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

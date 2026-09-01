import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as trackedUsersApi from "../../api/trackedUsers";
import * as anonymousUsersApi from "../../api/anonymousUsers";
import type { TrackedUserSummary, AnonymousVisitorSummary } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

/** A few identity properties worth their own column when present - everything else still shows up on the profile page itself (task brief section 12: keep the list simple). */
const HIGHLIGHT_PROPERTIES = ["plan", "role", "name", "email"];

type Segment = "identified" | "anonymous";

function displayName(user: TrackedUserSummary): string {
  return (user.properties.name as string | undefined) ?? user.externalUserId;
}

function SegmentToggle({ segment, onChange }: { segment: Segment; onChange: (s: Segment) => void }) {
  return (
    <div className="flex rounded-md bg-muted p-1">
      {(["identified", "anonymous"] as const).map((s) => (
        <Button
          type="button"
          key={s}
          onClick={() => onChange(s)}
          variant="ghost"
          size="sm"
          className={cn("h-7 font-normal text-muted-foreground", segment === s && "bg-card font-medium text-foreground shadow-sm hover:bg-card")}
        >
          {s === "identified" ? "Identified" : "Anonymous"}
        </Button>
      ))}
    </div>
  );
}

export function UsersPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [segment, setSegment] = useState<Segment>("identified");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<TrackedUserSummary[] | null>(null);
  const [visitors, setVisitors] = useState<AnonymousVisitorSummary[] | null>(null);
  const [total, setTotal] = useState(0);

  // Switching segment or search resets to the first page - a stale offset from the other list wouldn't mean anything here.
  useEffect(() => {
    setOffset(0);
  }, [segment, search]);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setUsers(null);
    setVisitors(null);
    setError(null);
    const handle = setTimeout(
      () => {
        if (segment === "identified") {
          trackedUsersApi
            .listUsers(currentOrg.orgId, currentSite.id, { search: search || undefined, limit: PAGE_SIZE, offset })
            .then((res) => {
              setUsers(res.users);
              setTotal(res.total);
            })
            .catch(() => setError("Couldn't load users."));
        } else {
          anonymousUsersApi
            .listAnonymousVisitors(currentOrg.orgId, currentSite.id, { search: search || undefined, limit: PAGE_SIZE, offset })
            .then((res) => {
              setVisitors(res.visitors);
              setTotal(res.total);
            })
            .catch(() => setError("Couldn't load anonymous visitors."));
        }
      },
      search ? 250 : 0
    ); // debounce typing, but not the initial/paged load
    return () => clearTimeout(handle);
  }, [currentOrg, currentSite, segment, search, offset]);

  // Which highlight properties actually appear on at least one user in this page, so we don't render empty columns.
  const activeColumns = HIGHLIGHT_PROPERTIES.filter((key) => users?.some((u) => key in u.properties && key !== "name"));

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Users" title="Users" description="People and visitors seen on this site." />
        <DataTableFrame>
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </DataTableFrame>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Users"
        title="Users"
        description={
          segment === "identified"
            ? "Everyone identified on this site via analytics.identify(), with their properties and activity."
            : "Visitors who have generated activity but haven't been identified via analytics.identify() yet."
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <SegmentToggle segment={segment} onChange={setSegment} />
            <Input
              className="w-60"
              placeholder={segment === "identified" ? "Search users..." : "Search by anonymous id..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <DataTableFrame>
        {error && (
          <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>
        )}

        {!error && users === null && visitors === null && (
          <LoadingRows count={6} />
        )}

        {segment === "identified" && users && users.length === 0 && (
          <EmptyState
            title={search ? "No users match that search" : "No users identified yet"}
            description={
              search ? (
                "Try a different search term."
              ) : (
                <>
                  Once the SDK calls <code>analytics.identify(userId, attributes)</code> for a visitor, they'll show
                  up here.
                </>
              )
            }
          />
        )}

        {segment === "identified" && users && users.length > 0 && (
          <table className={dataTableClass}>
            <thead>
              <tr>
                <th>User</th>
                <th>Last seen</th>
                <th>Sessions</th>
                {activeColumns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} onClick={() => navigate(`/users/${user.id}`)}>
                  <td className="min-w-52">
                    <div className="font-medium text-foreground">{displayName(user)}</div>
                    <div className="mono max-w-72 truncate text-xs text-muted-foreground">
                      {user.externalUserId}
                    </div>
                  </td>
                  <td className="mono text-muted-foreground">
                    {formatRelativeTime(user.lastSeenAt)}
                  </td>
                  <td className="mono">{user.sessionCount}</td>
                  {activeColumns.map((col) => (
                    <td key={col} className="max-w-48 truncate text-muted-foreground">
                      {col in user.properties ? String(user.properties[col]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {segment === "anonymous" && visitors && visitors.length === 0 && (
          <EmptyState
            title={search ? "No anonymous visitors match that search" : "No anonymous visitors yet"}
            description={
              search
                ? "Try a different anonymous id."
                : "Visitors show up here as soon as the SDK sees activity - before they've ever been identified."
            }
          />
        )}

        {segment === "anonymous" && visitors && visitors.length > 0 && (
          <table className={dataTableClass}>
            <thead>
              <tr>
                <th>Anonymous ID</th>
                <th>Last seen</th>
                <th>Sessions</th>
                <th>Page views</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.anonymousId} onClick={() => navigate(`/users/anonymous/${v.anonymousId}`)}>
                  <td className="mono max-w-sm break-all text-foreground">
                    {v.anonymousId}
                  </td>
                  <td className="mono text-muted-foreground">
                    {formatRelativeTime(v.lastSeenAt)}
                  </td>
                  <td className="mono">{v.sessionCount}</td>
                  <td className="mono">{v.pageViewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {((segment === "identified" && users && users.length > 0) || (segment === "anonymous" && visitors && visitors.length > 0)) &&
          total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button variant="ghost" size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
      </DataTableFrame>
    </>
  );
}

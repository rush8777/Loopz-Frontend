import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as trackedUsersApi from "../../api/trackedUsers";
import * as anonymousUsersApi from "../../api/anonymousUsers";
import type { TrackedUserSummary, AnonymousVisitorSummary } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";

const PAGE_SIZE = 25;

/** A few identity properties worth their own column when present - everything else still shows up on the profile page itself (task brief section 12: keep the list simple). */
const HIGHLIGHT_PROPERTIES = ["plan", "role", "name", "email"];

type Segment = "identified" | "anonymous";

function displayName(user: TrackedUserSummary): string {
  return (user.properties.name as string | undefined) ?? user.externalUserId;
}

function SegmentToggle({ segment, onChange }: { segment: Segment; onChange: (s: Segment) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--surface-raised)", padding: 3, borderRadius: 8 }}>
      {(["identified", "anonymous"] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={segment === s ? "btn btn-sm" : "btn btn-ghost btn-sm"}
          style={segment === s ? { background: "var(--users-dim)", color: "var(--users)", borderColor: "transparent" } : undefined}
        >
          {s === "identified" ? "Identified" : "Anonymous"}
        </button>
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
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
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
          <div style={{ display: "flex", gap: 12 }}>
            <SegmentToggle segment={segment} onChange={setSegment} />
            <input
              className="input"
              placeholder={segment === "identified" ? "Search users..." : "Search by anonymous id..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
          </div>
        }
      />

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && users === null && visitors === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
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
          <table className="table">
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
                  <td style={{ minWidth: 200 }}>
                    <div style={{ color: "var(--text-primary)" }}>{displayName(user)}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {user.externalUserId}
                    </div>
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(user.lastSeenAt)}
                  </td>
                  <td className="mono">{user.sessionCount}</td>
                  {activeColumns.map((col) => (
                    <td key={col} style={{ color: "var(--text-secondary)" }}>
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
          <table className="table">
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
                  <td className="mono" style={{ color: "var(--text-primary)" }}>
                    {v.anonymousId}
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                fontSize: 12.5,
                color: "var(--text-secondary)",
              }}
            >
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </div>
    </>
  );
}

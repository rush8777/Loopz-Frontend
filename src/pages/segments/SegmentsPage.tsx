import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as segmentsApi from "../../api/segments";
import type { Segment } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";

export function SegmentsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setError(null);
    // Debounce typing, but not the initial load - same pattern as UsersPage's search.
    const handle = setTimeout(
      () => {
        segmentsApi
          .listSegments(currentOrg.orgId, currentSite.id, { search: search || undefined, limit: 100 })
          .then((res) => {
            setSegments(res.segments);
            setTotal(res.total);
          })
          .catch(() => setError("Couldn't load segments."));
      },
      search ? 250 : 0
    );
    return () => clearTimeout(handle);
  }, [currentOrg, currentSite, search]);

  function updateSearch(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    setSearchParams(next, { replace: true });
  }

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Users" title="Segments" description="Dynamic audiences of users, defined by their behavior and properties." />
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
        title="Segments"
        description="Dynamic audiences of users, defined by their behavior and properties. Membership updates automatically as user data changes."
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/segments/new")}>
            + Create segment
          </button>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search segments..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}
        {!error && <SegmentsTable segments={segments} total={total} onOpen={(id) => navigate(`/segments/${id}`)} />}
      </div>
    </>
  );
}

function SegmentsTable({ segments, total, onOpen }: { segments: Segment[] | null; total: number; onOpen: (id: string) => void }) {
  if (segments === null) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  if (total === 0 && segments.length === 0) {
    return (
      <EmptyState
        title="No segments yet"
        description="Create a segment to group users by the events they've performed, their properties, or the pages they've visited."
      />
    );
  }

  if (segments.length === 0) {
    return <EmptyState title="No matching segments" description="Try a different search term." />;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Segment</th>
          <th>Audience</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {segments.map((s) => (
          <tr key={s.id} onClick={() => onOpen(s.id)}>
            <td>
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{s.name}</div>
              {s.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.description}</div>}
            </td>
            <td className="mono">{s.audienceCount.toLocaleString()} users</td>
            <td style={{ color: "var(--text-secondary)" }} title={formatTimestamp(s.updatedAt)}>
              {formatRelativeTime(s.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

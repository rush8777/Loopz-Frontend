import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as segmentsApi from "../../api/segments";
import type { Segment } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFrame, ErrorNotice, FilterToolbar, LoadingRows, dataTableClass } from "@/components/PageSurface";

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
        title="Segments"
        description="Dynamic audiences of users, defined by their behavior and properties. Membership updates automatically as user data changes."
        actions={
          <Button onClick={() => navigate("/segments/new")}><Plus />Create segment</Button>
        }
      />

      <FilterToolbar>
        <Input className="max-w-80"
          placeholder="Search segments..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
        />
      </FilterToolbar>

      <DataTableFrame>
        {error && (
          <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>
        )}
        {!error && <SegmentsTable segments={segments} total={total} onOpen={(id) => navigate(`/segments/${id}`)} />}
      </DataTableFrame>
    </>
  );
}

function SegmentsTable({ segments, total, onOpen }: { segments: Segment[] | null; total: number; onOpen: (id: string) => void }) {
  if (segments === null) {
    return (
      <LoadingRows />
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
    <table className={dataTableClass}>
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
              <div className="font-medium text-foreground">{s.name}</div>
              {s.description && <div className="mt-0.5 text-xs text-muted-foreground">{s.description}</div>}
            </td>
            <td className="mono">{s.audienceCount.toLocaleString()} users</td>
            <td className="text-muted-foreground" title={formatTimestamp(s.updatedAt)}>
              {formatRelativeTime(s.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

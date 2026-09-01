import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as funnelsApi from "../../api/funnels";
import type { FunnelListItem } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFrame, ErrorNotice, FilterToolbar, LoadingRows, dataTableClass } from "@/components/PageSurface";

export function FunnelsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const [funnels, setFunnels] = useState<FunnelListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setError(null);
    const handle = setTimeout(
      () => {
        funnelsApi
          .listFunnels(currentOrg.orgId, currentSite.id, { search: search || undefined, limit: 100 })
          .then((res) => {
            setFunnels(res.funnels);
            setTotal(res.total);
          })
          .catch(() => setError("Couldn't load funnels."));
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
        <PageHeader section="Observe" title="Funnels" description="How many users progress through an ordered sequence of steps, and where they drop off." />
        <DataTableFrame>
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </DataTableFrame>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title="Funnels"
        description="How many users progress through an ordered sequence of steps, and where they drop off."
        actions={
          <Button onClick={() => navigate("/observe/funnels/new")}><Plus />Create funnel</Button>
        }
      />

      <FilterToolbar>
        <Input
          className="max-w-80"
          placeholder="Search funnels..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
        />
      </FilterToolbar>

      <DataTableFrame>
        {error && (
          <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>
        )}
        {!error && <FunnelsList funnels={funnels} total={total} onOpen={(id) => navigate(`/observe/funnels/${id}`)} />}
      </DataTableFrame>
    </>
  );
}

function FunnelsList({ funnels, total, onOpen }: { funnels: FunnelListItem[] | null; total: number; onOpen: (id: string) => void }) {
  if (funnels === null) {
    return (
      <LoadingRows />
    );
  }

  if (total === 0 && funnels.length === 0) {
    return (
      <EmptyState
        title="No funnels yet"
        description="Create a funnel to see how many users move through an ordered sequence of events or pages, and where they drop off."
      />
    );
  }

  if (funnels.length === 0) {
    return <EmptyState title="No matching funnels" description="Try a different search term." />;
  }

  return (
    <table className={dataTableClass}>
      <thead>
        <tr>
          <th>Funnel</th>
          <th>Steps</th>
          <th>Conversion</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {funnels.map((f) => (
          <tr key={f.id} onClick={() => onOpen(f.id)}>
            <td>
              <div className="font-medium text-foreground">{f.name}</div>
              {f.description && <div className="mt-0.5 text-xs text-muted-foreground">{f.description}</div>}
            </td>
            <td className="mono">{f.stepCount} steps</td>
            <td className="mono">{f.overallConversion}% conversion</td>
            <td className="text-muted-foreground" title={formatTimestamp(f.updatedAt)}>
              {formatRelativeTime(f.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

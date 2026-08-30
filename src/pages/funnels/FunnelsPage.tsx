import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as funnelsApi from "../../api/funnels";
import type { FunnelListItem } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";

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
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
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
          <button className="btn btn-primary" onClick={() => navigate("/observe/funnels/new")}>
            + Create funnel
          </button>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search funnels..."
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
        {!error && <FunnelsList funnels={funnels} total={total} onOpen={(id) => navigate(`/observe/funnels/${id}`)} />}
      </div>
    </>
  );
}

function FunnelsList({ funnels, total, onOpen }: { funnels: FunnelListItem[] | null; total: number; onOpen: (id: string) => void }) {
  if (funnels === null) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 56 }} />
        ))}
      </div>
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
    <table className="table">
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
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{f.name}</div>
              {f.description && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{f.description}</div>}
            </td>
            <td className="mono">{f.stepCount} steps</td>
            <td className="mono">{f.overallConversion}% conversion</td>
            <td style={{ color: "var(--text-secondary)" }} title={formatTimestamp(f.updatedAt)}>
              {formatRelativeTime(f.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

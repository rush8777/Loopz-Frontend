import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { listHeatmaps } from "../../api/pages";

type HeatmapRow = { id: string; name: string; heatmapEnabled: boolean; interactions: number };

export function HeatmapsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HeatmapRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setRows(null);
    setError(null);
    listHeatmaps(currentOrg.orgId, currentSite.id)
      .then((result) => setRows(result.heatmaps))
      .catch(() => setError("Couldn't load Page heatmaps."));
  }, [currentOrg, currentSite]);

  return (
    <>
      <PageHeader section="Observe" title="Heatmaps" description="Heatmaps are grouped by Page rules and aggregate every matching raw URL." />
      {error && <div className="error-banner">{error}</div>}
      {!currentSite ? <div className="card"><EmptyState title="No site selected" description="Select a site from the switcher above." /></div>
        : rows === null && !error ? <div className="card card-padded"><div className="skeleton" style={{ height: 220 }} /></div>
        : rows?.length === 0 ? <div className="card"><EmptyState title="No Pages yet" description="Create a Page before enabling a heatmap." /></div>
        : rows && <div className="card"><table className="table"><thead><tr><th>Page</th><th>Status</th><th>Interactions</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id} onClick={() => navigate(`/observe/pages/${row.id}?tab=heatmap`)} style={{ cursor: "pointer" }}>
            <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{row.name}</td>
            <td><span className={`badge ${row.heatmapEnabled ? "badge-observe" : "badge-neutral"}`}>{row.heatmapEnabled ? "Active" : "Disabled"}</span></td>
            <td className="mono">{row.interactions.toLocaleString()}</td>
          </tr>)}
        </tbody></table></div>}
    </>
  );
}

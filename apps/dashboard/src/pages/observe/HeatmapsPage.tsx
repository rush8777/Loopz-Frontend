import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { listHeatmaps } from "../../api/pages";
import type { HeatmapIndexRow } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";

export function HeatmapsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [rows, setRows] = useState<HeatmapIndexRow[] | null>(null);
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
        : rows && <div className="card"><table className="table"><thead><tr><th>Page</th><th>Status</th><th>Interactions / clicks</th><th>Last activity</th><th>Reference</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id} onClick={() => navigate(`/observe/heatmaps/${row.id}`)} style={{ cursor: "pointer" }}>
            <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{row.name}</td>
            <td><span className={`badge ${row.heatmapEnabled ? "badge-observe" : "badge-neutral"}`}>{row.heatmapEnabled ? "Active" : "Disabled"}</span></td>
            <td className="mono">{row.interactions.toLocaleString()} / {row.clicks.toLocaleString()}</td>
            <td>{row.lastActivityAt ? formatRelativeTime(row.lastActivityAt) : "—"}</td>
            <td><span className={`badge ${row.referenceStatus === "ready" ? "badge-observe" : "badge-neutral"}`}>{row.referenceStatus === "ready" ? "Ready" : "Pending automatic capture"}</span></td>
          </tr>)}
        </tbody></table></div>}
    </>
  );
}

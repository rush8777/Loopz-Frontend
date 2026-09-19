import { useEffect, useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as analysisApi from "../../api/analysis";
import type { ClusterResult } from "../../types/api";
import { formatDuration } from "../../lib/format";

const FEATURE_LABEL: Record<string, string> = {
  totalEvents: "Events",
  clickCount: "Clicks",
  hoverCount: "Hovers",
  scrollCount: "Scrolls",
  uniqueTargets: "Unique targets",
  totalHoverMs: "Hover time",
  maxScrollPercent: "Max scroll",
  sessionDurationMs: "Duration",
};
const MS_FEATURES = new Set(["totalHoverMs", "sessionDurationMs"]);

function formatAverage(key: string, value: number): string {
  if (MS_FEATURES.has(key)) return formatDuration(Math.round(value));
  if (key === "maxScrollPercent") return `${Math.round(value)}%`;
  return value.toFixed(1);
}

export function PatternClusterPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [result, setResult] = useState<ClusterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setResult(null);
    setError(null);
    analysisApi
      .clusterSessions(currentOrg.orgId, currentSite.id)
      .then(setResult)
      .catch(() => setError("Couldn't load behavior clusters."));
  }, [currentOrg, currentSite]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Analysis" title="Behavior Clusters" description="Session archetypes grouped by overall behavioral shape." />
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Analysis"
        title="Behavior Clusters"
        description="Sessions grouped by overall behavioral shape (not an exact step sequence), ranked by conversion rate."
      />

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && result === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
          </div>
        )}

        {result && result.clusters.length === 0 && (
          <EmptyState
            title="Not enough sessions to cluster yet"
            description={result.note ?? `This site has ${result.totalSessions} session(s) so far - clustering needs a few more.`}
          />
        )}

        {result && result.clusters.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Cluster</th>
                <th>Sessions</th>
                <th>Conversion</th>
                <th>Typical behavior</th>
                <th>Sample sessions</th>
              </tr>
            </thead>
            <tbody>
              {result.clusters.map((c) => (
                <tr key={c.clusterId} style={{ cursor: "default" }}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>#{c.clusterId + 1}</td>
                  <td className="mono">{c.sessionCount}</td>
                  <td>
                    <span className="badge" style={{ background: "var(--analysis-dim)", color: "var(--analysis)" }}>
                      <span className="badge-dot" />
                      {Math.round(c.conversionRate * 100)}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.entries(c.averages).map(([key, value]) => (
                        <span
                          key={key}
                          className="mono"
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-secondary)",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "2px 6px",
                          }}
                        >
                          {FEATURE_LABEL[key] ?? key}: {formatAverage(key, value)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
                    {c.sampleSessionIds.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

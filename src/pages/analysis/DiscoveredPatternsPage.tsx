import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { TokenSequence } from "../../components/TokenSequence";
import * as analysisApi from "../../api/analysis";
import type { PatternCandidate } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";

function QualityBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", width: 76 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "var(--surface-raised)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: "100%", background: "var(--analysis)" }} />
      </div>
      <span className="mono" style={{ fontSize: 11, width: 32, textAlign: "right" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function DiscoveredPatternsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [candidates, setCandidates] = useState<PatternCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observing, setObserving] = useState(false);
  const [observeError, setObserveError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{ sessionCount: number; episodeCount: number } | null>(null);

  function reload() {
    if (!currentOrg || !currentSite) return;
    setCandidates(null);
    setError(null);
    analysisApi
      .listPatternCandidates(currentOrg.orgId, currentSite.id)
      .then((res) => setCandidates(res.candidates))
      .catch(() => setError("Couldn't load discovered patterns."));
  }

  useEffect(reload, [currentOrg, currentSite]);

  function runObservation() {
    if (!currentOrg || !currentSite) return;
    setObserving(true);
    setObserveError(null);
    analysisApi
      .observePatterns(currentOrg.orgId, currentSite.id)
      .then((res) => {
        setCandidates(res.candidates);
        setLastRun({ sessionCount: res.sessionCount, episodeCount: res.episodeCount });
      })
      .catch(() => setObserveError("Couldn't run pattern observation."))
      .finally(() => setObserving(false));
  }

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Analysis" title="Discovered Patterns" description="Recurring behavioral sequences found across sessions." />
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
        title="Discovered Patterns"
        description="Behavioral sequences that recur across sessions, grouped by similarity - not a judgment of whether a pattern is good or bad, just that it happens repeatedly."
        actions={
          <button className="btn btn-primary btn-sm" onClick={runObservation} disabled={observing}>
            {observing ? "Observing..." : "Run observation"}
          </button>
        }
      />

      {observeError && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          {observeError}
        </div>
      )}
      {lastRun && !observeError && (
        <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text-muted)" }}>
          Observed {lastRun.sessionCount} session(s), {lastRun.episodeCount} episode(s).
        </div>
      )}

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && candidates === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72 }} />
            ))}
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <EmptyState
            title="No recurring patterns discovered yet"
            description={
              <>
                Click <strong>Run observation</strong> to analyze this site's sessions for repeating behavior. A pattern needs to
                occur a few times before it's reported here.
              </>
            }
          />
        )}

        {candidates && candidates.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Sequence</th>
                <th>Occurrences</th>
                <th>Sessions</th>
                <th>Quality</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td style={{ maxWidth: 360 }}>
                    <Link to={`/analysis/discovered/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <TokenSequence tokens={c.representativeSequence} />
                    </Link>
                  </td>
                  <td className="mono">{c.occurrenceCount}</td>
                  <td className="mono">{c.uniqueSessionCount}</td>
                  <td style={{ minWidth: 160 }}>
                    <QualityBar label="Overall" value={c.quality.overallScore} />
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(c.lastSeenAt)}
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

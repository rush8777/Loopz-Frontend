import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { TokenSequence } from "../../components/TokenSequence";
import * as analysisApi from "../../api/analysis";
import type { PatternCandidateDetail } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";

const QUALITY_FIELDS: { key: keyof PatternCandidateDetail["candidate"]["quality"]; label: string; hint: string }[] = [
  { key: "frequencyScore", label: "Frequency", hint: "How often this occurs relative to the most common pattern on this site." },
  { key: "coverageScore", label: "Coverage", hint: "Share of occurrences that came from distinct sessions (low = one session repeating this)." },
  { key: "consistencyScore", label: "Consistency", hint: "How tightly the occurrences match the representative sequence." },
  { key: "recencyScore", label: "Recency", hint: "How recently this was last observed, relative to the observed time range." },
];

export function PatternCandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const [detail, setDetail] = useState<PatternCandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite || !candidateId) return;
    setDetail(null);
    setError(null);
    analysisApi
      .getPatternCandidate(currentOrg.orgId, currentSite.id, candidateId)
      .then(setDetail)
      .catch(() => setError("Couldn't load this pattern - it may have been removed by a more recent observation run."));
  }, [currentOrg, currentSite, candidateId]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Analysis" title="Pattern detail" />
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader section="Analysis" title="Pattern detail" />
        <div className="error-banner">{error}</div>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <PageHeader section="Analysis" title="Pattern detail" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60 }} />
          ))}
        </div>
      </>
    );
  }

  const { candidate, evidence } = detail;

  return (
    <>
      <PageHeader
        section="Analysis"
        title="Discovered pattern"
        description={`Observed ${candidate.occurrenceCount} time(s) across ${candidate.uniqueSessionCount} session(s), first seen ${formatRelativeTime(candidate.firstSeenAt)}.`}
        actions={
          <Link to="/analysis/discovered" className="btn btn-ghost btn-sm">
            Back to all patterns
          </Link>
        }
      />

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Representative sequence</h3>
        <TokenSequence tokens={candidate.representativeSequence} />
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Quality</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
          {QUALITY_FIELDS.map((field) => (
            <div key={field.key} title={field.hint} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)", width: 90 }}>{field.label}</span>
              <div style={{ flex: 1, height: 6, background: "var(--surface-raised)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.round(candidate.quality[field.key] * 100)}%`,
                    height: "100%",
                    background: "var(--analysis)",
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: 12, width: 36, textAlign: "right" }}>
                {Math.round(candidate.quality[field.key] * 100)}%
              </span>
            </div>
          ))}
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Overall ranking score</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
              {Math.round(candidate.quality.overallScore * 100)}%
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "6px 0 0" }}>
            A ranking aid for comparing discovered patterns against each other on this site - not a statistical confidence value.
          </p>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Sequence similarity across occurrences</h3>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Average</div>
            <div className="mono" style={{ fontSize: 16 }}>
              {Math.round(candidate.similarity.average * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Minimum</div>
            <div className="mono" style={{ fontSize: 16 }}>
              {Math.round(candidate.similarity.minimum * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Maximum</div>
            <div className="mono" style={{ fontSize: 16 }}>
              {Math.round(candidate.similarity.maximum * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: "14px 16px 0" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>Behavioral evidence</h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
            The {evidence.length} episode(s) that make up this pattern, each with its own observed sequence.
          </p>
        </div>

        {evidence.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState title="No episode evidence" description="This pattern has no linked episodes - it may be stale from an earlier observation run." />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Session</th>
                <th>When</th>
                <th>Boundary</th>
                <th>Observed sequence</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => (
                <tr key={ev.episodeId}>
                  <td>
                    <Link to={`/observe/sessions/${ev.sessionId}`} className="mono" style={{ color: "var(--observe)" }}>
                      {ev.sessionId}
                    </Link>
                  </td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
                    {formatTimestamp(ev.startedAt)}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {ev.startReason} &rarr; {ev.endReason}
                  </td>
                  <td style={{ maxWidth: 420 }}>
                    <TokenSequence tokens={ev.tokens} />
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

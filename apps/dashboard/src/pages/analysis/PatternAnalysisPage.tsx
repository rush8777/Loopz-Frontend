import { Fragment, useEffect, useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as patternsApi from "../../api/patterns";
import * as analysisApi from "../../api/analysis";
import type { Pattern, PatternStep, PatternStepVerb, SimilarSessionMatch } from "../../types/api";
import { formatDuration, formatRelativeTime } from "../../lib/format";
import { stepsToTokens } from "./stepsToTokens";

const VERB_LABEL: Record<PatternStepVerb, string> = {
  enter: "Enter site",
  hover: "Hover",
  click: "Click",
  scroll_past: "Scroll past",
};
const VERB_HAS_TARGET: Record<PatternStepVerb, boolean> = {
  enter: false,
  hover: true,
  click: true,
  scroll_past: false,
};

function newStep(): PatternStep {
  return { id: `s${Math.random().toString(36).slice(2, 8)}`, verb: "click", target: { selector: "" }, required: true };
}

export function PatternAnalysisPage() {
  const { currentOrg, currentSite } = useWorkspace();

  const [patterns, setPatterns] = useState<Pattern[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, { sessionId: string; matchedAt: string }[]>>({});

  // Builder state
  const [name, setName] = useState("");
  const [matchWindowMinutes, setMatchWindowMinutes] = useState(5);
  const [steps, setSteps] = useState<PatternStep[]>([newStep()]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fuzzy discovery panel
  const [threshold, setThreshold] = useState(0.7);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<SimilarSessionMatch[] | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  function reload() {
    if (!currentOrg || !currentSite) return;
    setPatterns(null);
    patternsApi
      .listPatterns(currentOrg.orgId, currentSite.id)
      .then((res) => setPatterns(res.patterns))
      .catch(() => setError("Couldn't load patterns."));
  }

  useEffect(reload, [currentOrg, currentSite]);

  function updateStep(id: string, patch: Partial<PatternStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  async function onSave() {
    if (!currentOrg || !currentSite) return;
    setSaveError(null);

    if (!name.trim()) return setSaveError("Give the pattern a name.");
    if (steps.length === 0) return setSaveError("Add at least one step.");
    if (!feedbackMessage.trim() || !feedbackTarget.trim()) {
      return setSaveError("Feedback message and target element are required.");
    }

    setSaving(true);
    try {
      await patternsApi.createPattern(currentOrg.orgId, currentSite.id, {
        name: name.trim(),
        matchWindowMs: matchWindowMinutes * 60_000,
        steps,
        feedback: { message: feedbackMessage.trim(), targetSelector: feedbackTarget.trim() },
      });
      setName("");
      setSteps([newStep()]);
      setFeedbackMessage("");
      setFeedbackTarget("");
      reload();
    } catch {
      setSaveError("Couldn't save this pattern - check that every step has a valid selector.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleStatus(pattern: Pattern) {
    if (!currentOrg || !currentSite) return;
    const nextStatus = pattern.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await patternsApi.updatePattern(currentOrg.orgId, currentSite.id, pattern.id, { status: nextStatus });
    reload();
  }

  async function onDelete(pattern: Pattern) {
    if (!currentOrg || !currentSite) return;
    await patternsApi.deletePattern(currentOrg.orgId, currentSite.id, pattern.id);
    reload();
  }

  async function onToggleMatches(pattern: Pattern) {
    if (!currentOrg || !currentSite) return;
    if (expandedMatches[pattern.id]) {
      setExpandedMatches((prev) => {
        const next = { ...prev };
        delete next[pattern.id];
        return next;
      });
      return;
    }
    const res = await patternsApi.getPatternMatches(currentOrg.orgId, currentSite.id, pattern.id);
    setExpandedMatches((prev) => ({ ...prev, [pattern.id]: res.matches }));
  }

  async function onDiscover() {
    if (!currentOrg || !currentSite) return;
    setDiscovering(true);
    setDiscoverError(null);
    setDiscoverResults(null);
    try {
      const tokens = stepsToTokens(steps);
      const res = await analysisApi.findSimilarSessions(currentOrg.orgId, currentSite.id, {
        referenceTokens: tokens,
        threshold,
      });
      setDiscoverResults(res.matches);
    } catch {
      setDiscoverError("Couldn't run discovery for this sequence.");
    } finally {
      setDiscovering(false);
    }
  }

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Analysis" title="Pattern Analysis" description="Build and manage behavioral patterns." />
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
        title="Pattern Analysis"
        description="Define a sequence of behavior, trigger feedback when it happens, and test it against real sessions."
      />

      {/* --- Builder --- */}
      <div className="card card-padded" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Build a pattern</h2>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Pattern name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="High purchase intent" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--surface-raised)", borderRadius: "var(--radius-sm)" }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)", width: 74, flexShrink: 0 }}>
                {i === 0 ? "WHEN" : "AND THEN"}
              </span>

              <select
                className="input"
                style={{ width: 130, height: 30, fontSize: 13 }}
                value={step.verb}
                onChange={(e) => updateStep(step.id, { verb: e.target.value as PatternStepVerb })}
              >
                {(Object.keys(VERB_LABEL) as PatternStepVerb[]).map((v) => (
                  <option key={v} value={v}>
                    {VERB_LABEL[v]}
                  </option>
                ))}
              </select>

              {VERB_HAS_TARGET[step.verb] && (
                <input
                  className="input mono"
                  style={{ flex: 1, height: 30, fontSize: 13 }}
                  placeholder="#pricing-cta"
                  value={step.target?.selector ?? ""}
                  onChange={(e) => updateStep(step.id, { target: { selector: e.target.value } })}
                />
              )}

              {step.verb === "hover" && (
                <input
                  className="input mono"
                  type="number"
                  style={{ width: 90, height: 30, fontSize: 13 }}
                  placeholder="sec"
                  value={step.minDurationMs != null ? step.minDurationMs / 1000 : ""}
                  onChange={(e) => updateStep(step.id, { minDurationMs: e.target.value ? Number(e.target.value) * 1000 : undefined })}
                />
              )}
              {step.verb === "scroll_past" && (
                <input
                  className="input mono"
                  type="number"
                  style={{ width: 80, height: 30, fontSize: 13 }}
                  placeholder="%"
                  value={step.minScrollPercent ?? ""}
                  onChange={(e) => updateStep(step.id, { minScrollPercent: e.target.value ? Number(e.target.value) : undefined })}
                />
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={step.required !== false}
                  onChange={(e) => updateStep(step.id, { required: e.target.checked })}
                />
                required
              </label>

              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--danger)", flexShrink: 0 }}
                onClick={() => removeStep(step.id)}
                disabled={steps.length === 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button className="btn btn-sm" onClick={() => setSteps((prev) => [...prev, newStep()])} style={{ marginBottom: 18 }}>
          + Add step
        </button>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div className="field" style={{ width: 160 }}>
            <label>Match window (min)</label>
            <input
              className="input mono"
              type="number"
              value={matchWindowMinutes}
              onChange={(e) => setMatchWindowMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Feedback message</label>
            <input
              className="input"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Need help deciding? Chat with us."
            />
          </div>
          <div className="field" style={{ width: 220 }}>
            <label>Show near</label>
            <input
              className="input mono"
              value={feedbackTarget}
              onChange={(e) => setFeedbackTarget(e.target.value)}
              placeholder="#cta"
            />
          </div>
        </div>

        {saveError && <div className="error-banner" style={{ marginBottom: 12 }}>{saveError}</div>}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save pattern (starts as Draft)"}
          </button>
          <button className="btn" onClick={onDiscover} disabled={discovering}>
            {discovering ? "Searching…" : "Test against real sessions"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>similarity ≥</span>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span className="mono" style={{ fontSize: 12, width: 32 }}>{Math.round(threshold * 100)}%</span>
          </div>
        </div>

        {discoverError && <div className="error-banner" style={{ marginTop: 12 }}>{discoverError}</div>}

        {discoverResults && (
          <div style={{ marginTop: 16 }}>
            {discoverResults.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                No sessions matched this sequence at ≥{Math.round(threshold * 100)}% similarity yet.
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Similarity</th>
                  </tr>
                </thead>
                <tbody>
                  {discoverResults.map((m) => (
                    <tr key={m.sessionId} style={{ cursor: "default" }}>
                      <td className="mono">{m.sessionId}</td>
                      <td className="mono">{Math.round(m.similarity * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* --- Existing patterns --- */}
      <div className="card">
        {error && <div style={{ padding: 16 }}><div className="error-banner">{error}</div></div>}

        {!error && patterns === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
          </div>
        )}

        {patterns && patterns.length === 0 && (
          <EmptyState title="No patterns yet" description="Build one above to start watching for it in live sessions." />
        )}

        {patterns && patterns.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Steps</th>
                <th>Window</th>
                <th>Matches</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <Fragment key={p.id}>
                  <tr style={{ cursor: "default" }}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</td>
                    <td>
                      <span
                        className="badge"
                        style={
                          p.status === "ACTIVE"
                            ? { background: "var(--analysis-dim)", color: "var(--analysis)" }
                            : { background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                        }
                      >
                        <span className="badge-dot" />
                        {p.status}
                      </span>
                    </td>
                    <td className="mono">{p.steps.length}</td>
                    <td className="mono">{formatDuration(p.matchWindowMs)}</td>
                    <td className="mono">
                      {p.matchCount > 0 ? (
                        <button className="btn btn-ghost btn-sm" style={{ padding: 0, height: "auto" }} onClick={() => onToggleMatches(p)}>
                          {p.matchCount}
                        </button>
                      ) : (
                        0
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-sm" onClick={() => onToggleStatus(p)}>
                          {p.status === "ACTIVE" ? "Pause" : "Activate"}
                        </button>
                        <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }} onClick={() => onDelete(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedMatches[p.id] && (
                    <tr style={{ cursor: "default" }}>
                      <td colSpan={6} style={{ background: "var(--surface-raised)" }}>
                        {expandedMatches[p.id].length === 0 ? (
                          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>No matches recorded.</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {expandedMatches[p.id].map((m, i) => (
                              <div key={i} style={{ display: "flex", gap: 12, fontSize: 13 }}>
                                <span className="mono">{m.sessionId}</span>
                                <span style={{ color: "var(--text-muted)" }}>{formatRelativeTime(m.matchedAt)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

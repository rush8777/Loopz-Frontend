export interface TokenSequenceStep {
  token: string;
  /** SDK-computed display name for this step's element, when captured - shown as the primary chip text, with the raw token as a hover tooltip. Falls back to the raw token when absent. */
  label?: string;
}

interface TokenSequenceProps {
  /** Either plain token strings (e.g. representativeSequence) or richer {token,label} steps (e.g. per-episode evidence). */
  tokens: (string | TokenSequenceStep)[];
}

/** Renders a behavioral token/step sequence as small mono chips with arrows between them. */
export function TokenSequence({ tokens }: TokenSequenceProps) {
  if (tokens.length === 0) return <span style={{ color: "var(--text-muted)" }}>-</span>;

  const steps: TokenSequenceStep[] = tokens.map((t) => (typeof t === "string" ? { token: t } : t));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
      {steps.map((step, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            className="mono"
            title={step.label ? step.token : undefined}
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "2px 6px",
              whiteSpace: "nowrap",
            }}
          >
            {step.label ?? step.token}
          </span>
          {i < steps.length - 1 && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>&rarr;</span>}
        </span>
      ))}
    </div>
  );
}

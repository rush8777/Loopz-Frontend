/** Renders a behavioral token sequence (e.g. ["page_enter","click:#cta","dwell:#cta"]) as small mono chips with arrows between them. */
export function TokenSequence({ tokens }: { tokens: string[] }) {
  if (tokens.length === 0) return <span style={{ color: "var(--text-muted)" }}>-</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
      {tokens.map((token, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            className="mono"
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
            {token}
          </span>
          {i < tokens.length - 1 && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>&rarr;</span>}
        </span>
      ))}
    </div>
  );
}

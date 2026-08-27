import type { ReactNode } from "react";

export function PageHeader({
  section,
  title,
  description,
  actions,
}: {
  section: "Observe" | "Analysis" | "Feedback" | "Users";
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const accentVar =
    section === "Observe" ? "--observe" : section === "Analysis" ? "--analysis" : section === "Users" ? "--users" : "--feedback";
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="badge"
        style={{ background: `var(${accentVar}-dim)`, color: `var(${accentVar})`, marginBottom: 10 }}
      >
        <span className="badge-dot" />
        {section}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h1>
          {description && (
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "6px 0 0" }}>{description}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}

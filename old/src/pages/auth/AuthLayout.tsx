import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, justifyContent: "center" }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "linear-gradient(135deg, var(--observe), var(--analysis))",
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Behave</span>
        </div>

        <div className="card card-padded">
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{title}</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 24px" }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

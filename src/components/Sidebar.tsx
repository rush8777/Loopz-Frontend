import { NavLink } from "react-router-dom";
import type { SettingsSection } from "./settings/SettingsModal";

interface NavItem {
  label: string;
  path?: string;
  disabled?: boolean;
}
interface NavSection {
  label: string;
  accentVar?: string; // CSS var name for the section's wayfinding color
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { label: "", items: [{ label: "Overview", disabled: true }] },
  {
    label: "Observe",
    accentVar: "--observe",
    items: [
      { label: "Sessions", path: "/observe/sessions" },
      { label: "Events", path: "/observe/events" },
      { label: "Funnels", path: "/observe/funnels" },
      // { label: "Replay", path: "/observe/replay" },
      { label: "Heatmaps", path: "/observe/heatmaps" },
      { label: "Elements", path: "/observe/elements" },
    ],
  },
  // {
  //   label: "Analysis",
  //   accentVar: "--analysis",
  //   items: [
  //     { label: "Discovered Patterns", path: "/analysis/discovered" },
  //     { label: "Pattern Analysis", path: "/analysis/patterns" },
  //     { label: "Behavior Clusters", path: "/analysis/clusters" },
  //   ],
  // },
  {
    label: "Feedback",
    accentVar: "--feedback",
    items: [{ label: "Campaigns", disabled: true }],
  },
  { label: "", items: [{ label: "Pages", path: "/observe/pages" }, { label: "Users", path: "/users" }, { label: "Segments", path: "/segments" }] },
];

export function Sidebar({ onOpenSettings }: { onOpenSettings: (section?: SettingsSection) => void }) {
  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: "linear-gradient(135deg, var(--observe), var(--analysis))",
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Behave</span>
      </div>

      {SECTIONS.map((section, i) => (
        <div key={i}>
          {section.label && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 8px 6px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
              }}
            >
              {section.accentVar && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: `var(${section.accentVar})`,
                  }}
                />
              )}
              {section.label}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {section.items.map((item) =>
              item.disabled || !item.path ? (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 8px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13.5,
                    color: "var(--text-muted)",
                    cursor: "not-allowed",
                  }}
                >
                  {item.label}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    Soon
                  </span>
                </div>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: "block",
                    padding: "7px 8px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? "var(--surface-raised)" : "transparent",
                  })}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => onOpenSettings("general")}
        style={{ marginTop: "auto", justifyContent: "flex-start", padding: "7px 8px", height: 34 }}
      >
        Settings
      </button>
    </nav>
  );
}

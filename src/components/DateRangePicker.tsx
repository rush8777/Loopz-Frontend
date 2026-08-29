import { DATE_RANGE_PRESETS, type DateRangePreset } from "../lib/dateRange";

export function DateRangePicker({
  preset,
  customSince,
  customUntil,
  onChange,
}: {
  preset: DateRangePreset;
  customSince?: string;
  customUntil?: string;
  onChange: (preset: DateRangePreset, customSince?: string, customUntil?: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 2, background: "var(--surface-raised)", borderRadius: "var(--radius-sm)", padding: 2 }}>
        {DATE_RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value, customSince, customUntil)}
            className="btn btn-sm"
            style={{
              background: preset === p.value ? "var(--surface)" : "transparent",
              border: "none",
              fontWeight: preset === p.value ? 600 : 400,
              color: preset === p.value ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={customSince?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", e.target.value, customUntil)}
          />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={customUntil?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", customSince, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

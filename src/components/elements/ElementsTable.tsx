import { useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { EmptyState } from "../EmptyState";
import * as elementsApi from "../../api/elements";
import type { CatalogElement } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";

function RenameField({ element, onSaved }: { element: CatalogElement; onSaved: (updated: CatalogElement) => void }) {
  const { currentOrg, currentSite } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(element.label ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!currentOrg || !currentSite || !value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await elementsApi.updateElement(currentOrg.orgId, currentSite.id, element.id, { label: value.trim() });
      onSaved(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return <input className="input" aria-label={`Rename ${element.label ?? element.selector}`} autoFocus value={value} disabled={saving}
      onChange={(event) => setValue(event.target.value)} onBlur={() => void save()}
      onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") { setValue(element.label ?? ""); setEditing(false); } }}
      style={{ fontSize: 13, padding: "4px 8px" }} />;
  }

  return (
    <button onClick={() => setEditing(true)} style={{ border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer" }} title="Click to rename">
      <span style={{ color: element.label ? "var(--text-primary)" : "var(--text-muted)" }}>{element.label ?? "Unnamed — click to add a label"}</span>
      {element.source === "manual" && <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>renamed</span>}
    </button>
  );
}

export function mergeElementMetadata(existing: CatalogElement, updated: CatalogElement): CatalogElement {
  return { ...existing, selector: updated.selector, tagName: updated.tagName, label: updated.label, role: updated.role, source: updated.source, isIgnored: updated.isIgnored };
}

export function ElementsTable({ elements, error, onUpdated, emptyDescription }: {
  elements: CatalogElement[] | null;
  error: string | null;
  onUpdated: (updated: CatalogElement) => void;
  emptyDescription: string;
}) {
  const { currentOrg, currentSite } = useWorkspace();
  const [showIgnored, setShowIgnored] = useState(false);
  const visibleElements = elements?.filter((element) => showIgnored || !element.isIgnored) ?? null;

  async function toggleIgnored(element: CatalogElement) {
    if (!currentOrg || !currentSite) return;
    const updated = await elementsApi.updateElement(currentOrg.orgId, currentSite.id, element.id, { isIgnored: !element.isIgnored });
    onUpdated(updated);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={showIgnored} onChange={(event) => setShowIgnored(event.target.checked)} /> Show ignored
        </label>
      </div>
      <div className="card">
        {error && <div style={{ padding: 16 }}><div className="error-banner">{error}</div></div>}
        {!error && elements === null && <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>{[...Array(6)].map((_, index) => <div key={index} className="skeleton" style={{ height: 44 }} />)}</div>}
        {elements && elements.length === 0 && <EmptyState title="No page elements discovered yet" description={emptyDescription} />}
        {visibleElements && visibleElements.length > 0 && (
          <table className="table">
            <thead><tr><th>Element</th><th>Type</th><th>Seen</th><th>Last seen</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visibleElements.map((element) => (
              <tr key={element.id} style={{ opacity: element.isIgnored ? 0.5 : 1 }}>
                <td style={{ minWidth: 260 }}><RenameField element={element} onSaved={onUpdated} /><div className="mono" style={{ color: "var(--text-secondary)", fontSize: 11.5, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={element.selector}>{element.selector}</div></td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{element.role ?? element.tagName}</td>
                <td className="mono">{element.seenCount.toLocaleString()}</td>
                <td className="mono" style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(element.lastSeenAt)}</td>
                <td><span className={`badge ${element.isIgnored ? "badge-neutral" : "badge-observe"}`}>{element.isIgnored ? "Ignored" : "Active"}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => void toggleIgnored(element)}>{element.isIgnored ? "Unignore" : "Ignore"}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {elements && elements.length > 0 && visibleElements?.length === 0 && <EmptyState title="All elements are ignored" description="Turn on Show ignored above to see them." />}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
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
    } catch {
      // Leave the field open so the user can retry rather than silently losing their edit.
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        className="input"
        autoFocus
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(element.label ?? "");
            setEditing(false);
          }
        }}
        style={{ fontSize: 13, padding: "4px 8px" }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{ border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
      title="Click to rename"
    >
      {element.label ? (
        <span style={{ color: "var(--text-primary)" }}>{element.label}</span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>Unnamed - click to add a label</span>
      )}
      {element.source === "manual" && (
        <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>
          renamed
        </span>
      )}
    </button>
  );
}

export function ElementsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [elements, setElements] = useState<CatalogElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setElements(null);
    setError(null);
    elementsApi
      .listElements(currentOrg.orgId, currentSite.id)
      .then((res) => setElements(res.elements))
      .catch(() => setError("Couldn't load elements."));
  }, [currentOrg, currentSite]);

  function patchLocal(updated: CatalogElement) {
    setElements((prev) => (prev ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev));
  }

  async function toggleIgnored(element: CatalogElement) {
    if (!currentOrg || !currentSite) return;
    try {
      const updated = await elementsApi.updateElement(currentOrg.orgId, currentSite.id, element.id, {
        isIgnored: !element.isIgnored,
      });
      patchLocal(updated);
    } catch {
      // Best-effort - the toggle just won't change; the row's own state is the source of truth for a retry.
    }
  }

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Elements" description="Interactive elements discovered on this site." />
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
      </>
    );
  }

  const visibleElements = elements?.filter((e) => showIgnored || !e.isIgnored) ?? null;

  return (
    <>
      <PageHeader
        section="Observe"
        title="Elements"
        description="Every interactive element the SDK has found on this site, whether or not anyone has clicked it yet. Rename one for a friendlier name everywhere in the dashboard, or mark noise as ignored."
        actions={
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
            Show ignored
          </label>
        }
      />

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && elements === null && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        )}

        {elements && elements.length === 0 && (
          <EmptyState
            title="No elements discovered yet"
            description={
              <>
                Once the SDK's element crawler reports elements for this site to{" "}
                <code>/public/sites/{currentSite.siteId}/elements</code>, they'll appear here.
              </>
            }
          />
        )}

        {visibleElements && visibleElements.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Selector</th>
                <th>Type</th>
                <th>Seen</th>
                <th>Last seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleElements.map((el) => (
                <tr key={el.id} style={{ opacity: el.isIgnored ? 0.5 : 1 }}>
                  <td style={{ minWidth: 200 }}>
                    <RenameField element={el} onSaved={patchLocal} />
                  </td>
                  <td
                    className="mono"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 11.5,
                      maxWidth: 320,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={el.selector}
                  >
                    {el.selector}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{el.role ?? el.tagName}</td>
                  <td className="mono">{el.seenCount}</td>
                  <td className="mono" style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(el.lastSeenAt)}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleIgnored(el)}>
                      {el.isIgnored ? "Unignore" : "Ignore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {elements && elements.length > 0 && visibleElements?.length === 0 && (
          <EmptyState title="All elements are ignored" description="Toggle 'Show ignored' above to see them." />
        )}
      </div>
    </>
  );
}

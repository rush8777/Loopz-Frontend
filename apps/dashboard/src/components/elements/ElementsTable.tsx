import { useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { EmptyState } from "../EmptyState";
import * as elementsApi from "../../api/elements";
import type { CatalogElement } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";
import { Button } from "@movecues/ui";
import { Badge } from "@movecues/ui";
import { Checkbox } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { cn } from "@movecues/ui";

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
    return <Input className="h-8 py-1 text-[13px]" aria-label={`Rename ${element.label ?? element.selector}`} autoFocus value={value} disabled={saving}
      onChange={(event) => setValue(event.target.value)} onBlur={() => void save()}
      onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") { setValue(element.label ?? ""); setEditing(false); } }}
    />;
  }

  return (
    <Button variant="ghost" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-normal hover:bg-transparent" onClick={() => setEditing(true)} title="Click to rename">
      <span className={cn(element.label ? "text-foreground" : "text-muted-foreground")}>{element.label ?? "Unnamed — click to add a label"}</span>
      {element.source === "manual" && <Badge variant="secondary">renamed</Badge>}
    </Button>
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
      <div className="mb-2.5 flex justify-end">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
          <Checkbox checked={showIgnored} onCheckedChange={(checked) => setShowIgnored(checked === true)} /> Show ignored
        </label>
      </div>
      <DataTableFrame>
        {error && <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>}
        {!error && elements === null && <LoadingRows count={6} />}
        {elements && elements.length === 0 && <EmptyState title="No page elements discovered yet" description={emptyDescription} />}
        {visibleElements && visibleElements.length > 0 && (
          <table className={dataTableClass}>
            <thead><tr><th>Element</th><th>Type</th><th>Seen</th><th>Last seen</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{visibleElements.map((element) => (
              <tr key={element.id} className={cn(element.isIgnored && "opacity-50")}>
                <td className="min-w-[260px]"><RenameField element={element} onSaved={onUpdated} /><div className="mono max-w-[360px] truncate text-[11.5px] text-muted-foreground" title={element.selector}>{element.selector}</div></td>
                <td className="text-xs text-muted-foreground">{element.role ?? element.tagName}</td>
                <td className="mono">{element.seenCount.toLocaleString()}</td>
                <td className="mono text-muted-foreground">{formatRelativeTime(element.lastSeenAt)}</td>
                <td><span className={`badge ${element.isIgnored ? "badge-neutral" : "badge-observe"}`}>{element.isIgnored ? "Ignored" : "Active"}</span></td>
                <td><Button variant="ghost" size="sm" onClick={() => void toggleIgnored(element)}>{element.isIgnored ? "Unignore" : "Ignore"}</Button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {elements && elements.length > 0 && visibleElements?.length === 0 && <EmptyState title="All elements are ignored" description="Turn on Show ignored above to see them." />}
      </DataTableFrame>
    </>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as pagesApi from "../../api/pages";
import * as experiencesApi from "../../api/experiences";
import type { PageDefinition } from "../../types/api";
import type { ExperienceKind, WidgetType } from "../../types/experiences";
import { Button } from "@movecues/ui";
import { Checkbox } from "@movecues/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { Label } from "@movecues/ui";

export function CreateExperienceModal({ kind, widgetType: fixedWidgetType, singularLabel = kind, open, onOpenChange, onCreated }: { kind: ExperienceKind; widgetType?: WidgetType; singularLabel?: string; open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => void }) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [pages, setPages] = useState<PageDefinition[]>([]);
  const [name, setName] = useState(`Untitled ${singularLabel}`);
  const [preset, setPreset] = useState<"default" | "minimal" | "soft" | "compact">("default");
  const [source, setSource] = useState("manual"); const [manualUrl, setManualUrl] = useState(""); const [targetPage, setTargetPage] = useState(false); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && currentOrg && currentSite) pagesApi.listPages(currentOrg.orgId, currentSite.id).then((r) => { setPages(r.pages); if (r.pages[0]) setSource(r.pages[0].id); }).catch(() => setPages([])); }, [open, currentOrg, currentSite]);

  async function submit() {
    if (!currentOrg || !currentSite) return; setError(null);
    if (!name.trim()) return setError("Enter a name.");
    if (kind === "widget" && !fixedWidgetType) return setError("Choose an experience collection before creating a widget.");
    if (kind !== "checklist" && source === "manual") { try { const url = new URL(manualUrl); const domain = currentSite.domain ? new URL(/^https?:\/\//.test(currentSite.domain) ? currentSite.domain : `https://${currentSite.domain}`) : null; if (!domain || url.origin !== domain.origin) return setError("Enter a URL on this site's configured domain."); } catch { return setError("Enter a valid absolute URL."); } }
    setSaving(true);
    try {
      const experience = await experiencesApi.createExperience(currentOrg.orgId, currentSite.id, { kind, widgetType: kind === "widget" ? fixedWidgetType : null, name: name.trim(), buildPageId: kind === "checklist" || source === "manual" ? null : source, buildUrl: kind === "checklist" ? null : source === "manual" ? manualUrl : null, template: kind === "checklist" ? preset : "blank", useBuildPageAsTarget: kind === "checklist" ? false : targetPage });
      navigate(`/experiences/${experience.id}/edit`);
      onOpenChange(false); onCreated?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't create the draft."); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><div className="p-6"><DialogHeader><DialogTitle>Create {singularLabel}</DialogTitle><DialogDescription>{kind === "checklist" ? "Create a persistent onboarding task companion." : kind === "widget" ? "Design it live inside your product." : "Create a multi-step guide on top of your product."}</DialogDescription></DialogHeader><div className="mt-5 grid gap-4">
    <Label className="grid gap-1.5">Name<Input value={name} onChange={(e)=>setName(e.target.value)} /></Label>
    {kind !== "checklist" && <><Label className="grid gap-1.5">Build on page<select className="h-9 rounded-md border bg-input px-3 text-sm" value={source} onChange={(e)=>setSource(e.target.value)}>{pages.map((page)=><option key={page.id} value={page.id}>{page.name}</option>)}<option value="manual">Enter URL manually</option></select></Label>{source === "manual" && <Label className="grid gap-1.5">Page URL<Input type="url" placeholder="https://app.example.com/dashboard" value={manualUrl} onChange={(e)=>setManualUrl(e.target.value)} /></Label>}<Label className="grid gap-1.5">Template<select className="h-9 rounded-md border bg-input px-3 text-sm"><option>Start blank</option></select></Label><label className="flex items-start gap-2 text-sm"><Checkbox checked={targetPage} onCheckedChange={(value)=>setTargetPage(value === true)} /><span>Use this page as the initial page-targeting rule</span></label></>}
    {kind === "checklist" && <Label className="grid gap-1.5">Preset<select className="h-9 rounded-md border bg-input px-3 text-sm" value={preset} onChange={event => setPreset(event.target.value as typeof preset)}><option value="default">Default</option><option value="minimal">Minimal</option><option value="soft">Soft</option><option value="compact">Compact</option></select></Label>}
    {error && <p className="m-0 text-sm text-destructive">{error}</p>}
  </div><DialogFooter className="mt-6"><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={submit}>{saving ? "Opening…" : "Open Editor"}</Button></DialogFooter></div></DialogContent></Dialog>;
}

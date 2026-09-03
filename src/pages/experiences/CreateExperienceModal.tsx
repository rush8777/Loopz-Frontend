import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as pagesApi from "../../api/pages";
import * as experiencesApi from "../../api/experiences";
import type { PageDefinition } from "../../types/api";
import type { ExperienceKind, WidgetType } from "../../types/experiences";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateExperienceModal({ kind, open, onOpenChange, onCreated }: { kind: ExperienceKind; open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => void }) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [pages, setPages] = useState<PageDefinition[]>([]);
  const [name, setName] = useState(kind === "guide" ? "Untitled guide" : "Untitled widget"); const [widgetType, setWidgetType] = useState<WidgetType>("anchored_card");
  const [source, setSource] = useState("manual"); const [manualUrl, setManualUrl] = useState(""); const [targetPage, setTargetPage] = useState(false); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && currentOrg && currentSite) pagesApi.listPages(currentOrg.orgId, currentSite.id).then((r) => { setPages(r.pages); if (r.pages[0]) setSource(r.pages[0].id); }).catch(() => setPages([])); }, [open, currentOrg, currentSite]);

  async function submit() {
    if (!currentOrg || !currentSite) return; setError(null);
    if (!name.trim()) return setError("Enter a name.");
    if (source === "manual") { try { const url = new URL(manualUrl); const domain = currentSite.domain ? new URL(/^https?:\/\//.test(currentSite.domain) ? currentSite.domain : `https://${currentSite.domain}`) : null; if (!domain || url.origin !== domain.origin) return setError("Enter a URL on this site's configured domain."); } catch { return setError("Enter a valid absolute URL."); } }
    setSaving(true); const popup = window.open("about:blank", "_blank");
    try {
      const experience = await experiencesApi.createExperience(currentOrg.orgId, currentSite.id, { kind, widgetType: kind === "widget" ? widgetType : null, name: name.trim(), buildPageId: source === "manual" ? null : source, buildUrl: source === "manual" ? manualUrl : null, template: "blank", useBuildPageAsTarget: targetPage });
      const session = await experiencesApi.createEditorSession(currentOrg.orgId, currentSite.id, experience.id);
      if (popup) popup.location.href = session.launchUrl; else navigate(`/experiences/builder?experienceId=${experience.id}&popupBlocked=1`);
      onOpenChange(false); onCreated?.();
    } catch (caught) { popup?.close(); setError(caught instanceof Error ? caught.message : "Couldn't create the draft."); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><div className="p-6"><DialogHeader><DialogTitle>Create {kind}</DialogTitle><DialogDescription>{kind === "widget" ? "Choose how it appears, then design it live inside your product." : "Create a multi-step guide on top of your product."}</DialogDescription></DialogHeader><div className="mt-5 grid gap-4">
    <Label className="grid gap-1.5">Name<Input value={name} onChange={(e)=>setName(e.target.value)} /></Label>
    {kind === "widget" && <Label className="grid gap-1.5">Widget type<select className="h-9 rounded-md border bg-input px-3 text-sm" value={widgetType} onChange={(e)=>setWidgetType(e.target.value as WidgetType)}><option value="anchored_card">Anchored card</option><option value="toast">Toast</option><option value="cursor_follow">Cursor-follow card</option></select></Label>}
    <Label className="grid gap-1.5">Build on page<select className="h-9 rounded-md border bg-input px-3 text-sm" value={source} onChange={(e)=>setSource(e.target.value)}>{pages.map((page)=><option key={page.id} value={page.id}>{page.name}</option>)}<option value="manual">Enter URL manually</option></select></Label>
    {source === "manual" && <Label className="grid gap-1.5">Page URL<Input type="url" placeholder="https://app.example.com/dashboard" value={manualUrl} onChange={(e)=>setManualUrl(e.target.value)} /></Label>}
    <Label className="grid gap-1.5">Template<select className="h-9 rounded-md border bg-input px-3 text-sm"><option>Start blank</option></select></Label>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={targetPage} onCheckedChange={(value)=>setTargetPage(value === true)} /><span>Use this page as the initial page-targeting rule</span></label>
    {error && <p className="m-0 text-sm text-destructive">{error}</p>}
  </div><DialogFooter className="mt-6"><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={submit}>{saving ? "Opening…" : "Open visual editor"}</Button></DialogFooter></div></DialogContent></Dialog>;
}


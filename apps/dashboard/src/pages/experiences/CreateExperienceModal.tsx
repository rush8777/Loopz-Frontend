import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as pagesApi from "../../api/pages";
import * as experiencesApi from "../../api/experiences";
import type { PageDefinition } from "../../types/api";
import type { ExperienceKind, WidgetType } from "../../types/experiences";
import { Button } from "@movcues/ui";
import { Checkbox } from "@movcues/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@movcues/ui";
import { Input } from "@movcues/ui";
import { Label } from "@movcues/ui";
import { LayoutDashboard, MousePointer2 } from "lucide-react";
import type { BuilderMode } from "../../types/experiences";
import { openLiveEditorPopup } from "./liveEditorPopup";

export function CreateExperienceModal({ kind, widgetType: fixedWidgetType, singularLabel = kind, open, onOpenChange, onCreated }: { kind: ExperienceKind; widgetType?: WidgetType; singularLabel?: string; open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => void }) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [pages, setPages] = useState<PageDefinition[]>([]);
  const [name, setName] = useState(`Untitled ${singularLabel}`);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("grapesjs");
  const [guidePattern, setGuidePattern] = useState<"anchored_card" | "modal">("anchored_card");
  const [preset, setPreset] = useState<"default" | "minimal" | "soft" | "compact">("default");
  const [source, setSource] = useState("manual"); const [manualUrl, setManualUrl] = useState(""); const [targetPage, setTargetPage] = useState(false); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const onsiteAvailable = kind === "guide" || (kind === "widget" && !!fixedWidgetType && !["survey", "hotspot"].includes(fixedWidgetType));
  useEffect(() => { if (open && currentOrg && currentSite) { setBuilderMode("grapesjs"); setGuidePattern("anchored_card"); setTargetPage(false); pagesApi.listPages(currentOrg.orgId, currentSite.id).then((r) => { setPages(r.pages); if (r.pages[0]) setSource(r.pages[0].id); else { setSource("manual"); setTargetPage(false); } }).catch(() => { setPages([]); setSource("manual"); setTargetPage(false); }); } }, [open, currentOrg, currentSite]);

  async function submit() {
    if (!currentOrg || !currentSite) return; setError(null);
    if (!name.trim()) return setError("Enter a name.");
    if (kind === "widget" && !fixedWidgetType) return setError("Choose an experience collection before creating a widget.");
    if (kind !== "checklist" && source === "manual") { try { const url = new URL(manualUrl); const domain = currentSite.domain ? new URL(/^https?:\/\//.test(currentSite.domain) ? currentSite.domain : `https://${currentSite.domain}`) : null; if (!domain || url.origin !== domain.origin) return setError("Enter a URL on this site's configured domain."); } catch { return setError("Enter a valid absolute URL."); } }
    const popup = builderMode === "onsite" ? openLiveEditorPopup() : null;
    if (builderMode === "onsite" && !popup) return setError("Your browser blocked the on-site builder window. Allow popups for Movcues and try again.");
    setSaving(true);
    try {
      const experience = await experiencesApi.createExperience(currentOrg.orgId, currentSite.id, { kind, widgetType: kind === "widget" ? fixedWidgetType : null, builderMode, ...(kind === "guide" && builderMode === "onsite" ? { guidePattern } : {}), name: name.trim(), buildPageId: kind === "checklist" || source === "manual" ? null : source, buildUrl: kind === "checklist" ? null : source === "manual" ? manualUrl : null, template: kind === "checklist" ? preset : "blank", useBuildPageAsTarget: kind === "checklist" ? false : targetPage });
      let launchError: string | null = null;
      if (builderMode === "onsite" && popup) {
        try {
          const session = await experiencesApi.createEditorSession(currentOrg.orgId, currentSite.id, experience.id);
          popup.location.replace(session.launchUrl); popup.focus();
        } catch (caught) {
          popup.close();
          launchError = caught instanceof Error ? caught.message : "The on-site builder could not be opened.";
        }
      }
      navigate(`/experiences/${experience.id}/edit`, launchError ? { state: { onsiteLaunchError: `${launchError} The draft was created safely; use Open on-site builder to try again.` } } : undefined);
      onOpenChange(false); onCreated?.();
    } catch (caught) { popup?.close(); setError(caught instanceof Error ? caught.message : "Couldn't create the draft."); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[calc(100dvh-32px)] max-w-lg flex-col overflow-hidden p-0"><DialogHeader className="shrink-0 border-b px-5 py-4 pr-12"><DialogTitle className="text-[17px] tracking-[-0.01em]">Create {singularLabel}</DialogTitle><DialogDescription className="text-[13px] leading-5">{kind === "checklist" ? "Create a persistent onboarding task companion." : kind === "widget" ? "Choose where this experience will be authored." : "Choose where this guide will be authored."}</DialogDescription></DialogHeader><div className="grid min-h-0 gap-4 overflow-y-auto p-5">
    <Label className="grid gap-1.5 text-[13px]">Name<Input value={name} onChange={(e)=>setName(e.target.value)} /></Label>
    <fieldset className="grid gap-2"><legend className="mb-1 text-[13px] font-medium">Builder</legend><div className="grid gap-2 sm:grid-cols-2">
      <button type="button" aria-pressed={builderMode === "grapesjs"} onClick={() => setBuilderMode("grapesjs")} className={`rounded-lg border p-3 text-left transition-colors ${builderMode === "grapesjs" ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:bg-muted/50"}`}><LayoutDashboard className="mb-2 size-4 text-primary"/><strong className="block text-sm">Dashboard Builder</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">Advanced GrapesJS canvas, drag-and-drop and detailed HTML/CSS customization.</span></button>
      <button type="button" aria-pressed={builderMode === "onsite"} disabled={!onsiteAvailable} onClick={() => onsiteAvailable && setBuilderMode("onsite")} className={`rounded-lg border p-3 text-left transition-colors ${builderMode === "onsite" ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:bg-muted/50"} disabled:cursor-not-allowed disabled:opacity-50`}><MousePointer2 className="mb-2 size-4 text-primary"/><strong className="block text-sm">On-site Visual Builder</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">Add blocks, arrange cells, and edit content on your live application.</span>{!onsiteAvailable && <span className="mt-2 block text-[11px] font-medium text-amber-700">Not available for this specialized experience type.</span>}</button>
    </div></fieldset>
    {kind === "guide" && builderMode === "onsite" && <Label className="grid gap-1.5 text-[13px]">First step<select aria-label="First step" className="h-9 w-full rounded-md border bg-input px-3 text-sm shadow-[rgba(0,0,0,.05)_0_1px_2px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={guidePattern} onChange={(event)=>setGuidePattern(event.target.value as typeof guidePattern)}><option value="anchored_card">Anchored card</option><option value="modal">Modal</option></select></Label>}
    {kind !== "checklist" && <><Label className="grid gap-1.5 text-[13px]">Build on page<select className="h-9 w-full rounded-md border bg-input px-3 text-sm shadow-[rgba(0,0,0,.05)_0_1px_2px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={source} onChange={(e)=>setSource(e.target.value)}>{pages.map((page)=><option key={page.id} value={page.id}>{page.name}</option>)}<option value="manual">Enter URL manually</option></select></Label>{source === "manual" && <Label className="grid gap-1.5 text-[13px]">Page URL<Input type="url" placeholder="https://app.example.com/dashboard" value={manualUrl} onChange={(e)=>setManualUrl(e.target.value)} /></Label>}<Label className="grid gap-1.5 text-[13px]">Template<select className="h-9 w-full rounded-md border bg-input px-3 text-sm shadow-[rgba(0,0,0,.05)_0_1px_2px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20"><option>Start blank</option></select></Label><label className="flex items-start gap-2 text-[13px]"><Checkbox checked={targetPage} onCheckedChange={(value)=>setTargetPage(value === true)} /><span>Use this page as the initial page-targeting rule</span></label></>}
    {kind === "checklist" && <Label className="grid gap-1.5 text-[13px]">Preset<select className="h-9 w-full rounded-md border bg-input px-3 text-sm shadow-[rgba(0,0,0,.05)_0_1px_2px] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={preset} onChange={event => setPreset(event.target.value as typeof preset)}><option value="default">Default</option><option value="minimal">Minimal</option><option value="soft">Soft</option><option value="compact">Compact</option></select></Label>}
    <p className="m-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Your builder choice is permanent for this experience. You won't be able to switch between the On-site Visual Builder and the GrapesJS Dashboard Builder.</p>
    {error && <p className="m-0 text-sm text-destructive">{error}</p>}
  </div><DialogFooter className="shrink-0 border-t px-5 py-3"><Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={submit}>{saving ? "Opening…" : builderMode === "onsite" ? "Create & open on site" : "Create & open dashboard"}</Button></DialogFooter></DialogContent></Dialog>;
}

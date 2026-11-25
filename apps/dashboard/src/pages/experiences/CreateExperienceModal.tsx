import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as pagesApi from "../../api/pages";
import * as experiencesApi from "../../api/experiences";
import type { VisualPresetId } from "../../api/experiences";
import type { PageDefinition } from "../../types/api";
import type { BuilderMode, ExperienceKind, ExperienceWidgetType } from "../../types/experiences";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@movcues/ui";
import { LayoutDashboard, MousePointer2, Palette, Sparkles } from "lucide-react";
import { openLiveEditorPopup } from "./liveEditorPopup";

const presets: Array<{ id: VisualPresetId; label: string; colors: [string, string, string] }> = [
  { id: "minimal", label: "Minimal", colors: ["#ffffff", "#111827", "#2563eb"] },
  { id: "modern", label: "Modern", colors: ["#f8fafc", "#0f172a", "#4f46e5"] },
  { id: "soft", label: "Soft", colors: ["#f0f9ff", "#1e293b", "#0284c7"] },
  { id: "dark", label: "Dark", colors: ["#0f172a", "#f8fafc", "#818cf8"] },
];

export function CreateExperienceModal({ kind, widgetType: fixedExperienceWidgetType, singularLabel = kind, open, onOpenChange, onCreated }: { kind: ExperienceKind; widgetType?: ExperienceWidgetType; singularLabel?: string; open: boolean; onOpenChange: (open: boolean) => void; onCreated?: () => void }) {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate();
  const [pages, setPages] = useState<PageDefinition[]>([]); const [hasSiteTheme, setHasSiteTheme] = useState(false); const [siteThemeColors, setSiteThemeColors] = useState<[string, string, string] | null>(null);
  const [name, setName] = useState(`Untitled ${singularLabel}`);
  const [manualBuilder, setBuilderMode] = useState<BuilderMode>("grapesjs");
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const [manualCreation, setManualCreation] = useState(false);
  const [readingCatalog, setReadingCatalog] = useState(false);
  const [captureTargetPage, setCaptureTargetPage] = useState(true);
  const geoAgent = fixedExperienceWidgetType === "geo_agent";
  const guidedCapture = kind === "guide" && captureEnabled && !manualCreation;
  const builderMode = geoAgent ? "geo_agent" : guidedCapture ? "onsite" : manualBuilder;
  const [guidePattern, setGuidePattern] = useState<"anchored_card" | "modal">("anchored_card"); const [legacyPreset, setLegacyPreset] = useState<"default" | "minimal" | "soft" | "compact">("default");
  const [themeSource, setThemeSource] = useState<"template" | "site" | "preset">("template"); const [visualPreset, setVisualPreset] = useState<VisualPresetId>("modern");
  const [source, setSource] = useState("manual"); const [manualUrl, setManualUrl] = useState(""); const [targetPage, setTargetPage] = useState(false); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const onsiteAvailable = kind === "checklist" || kind === "guide" || (kind === "widget" && !!fixedExperienceWidgetType);

  useEffect(() => {
    if (!open || !currentOrg || !currentSite || geoAgent) return;
    let current = true;
    setBuilderMode("grapesjs"); setGuidePattern("anchored_card"); setTargetPage(false); setThemeSource("template"); setError(null);
    setCaptureEnabled(false); setManualCreation(false); setCaptureTargetPage(true); setReadingCatalog(kind === "guide");
    Promise.all([pagesApi.listPages(currentOrg.orgId, currentSite.id), experiencesApi.listExperienceTemplates(currentOrg.orgId, currentSite.id, kind, fixedExperienceWidgetType)])
      .then(([pageResult, catalog]) => {
        if (!current) return;
        setCaptureEnabled(catalog.guidedCaptureEnabled === true);
        setPages(pageResult.pages); setHasSiteTheme(catalog.hasSiteTheme); setSiteThemeColors(catalog.siteThemeColors ?? null);
        if (pageResult.pages[0]) setSource(pageResult.pages[0].id); else { setSource("manual"); setTargetPage(false); }
      })
      .catch(() => {
        if (!current) return;
        setPages([]); setHasSiteTheme(false); setSiteThemeColors(null); setSource("manual"); setTargetPage(false);
      })
      .finally(() => { if (current) setReadingCatalog(false); });
    return () => { current = false; };
  }, [open, currentOrg, currentSite, kind, fixedExperienceWidgetType, geoAgent]);

  async function submit() {
    if (!currentOrg || !currentSite) return; setError(null);
    if (!name.trim()) return setError("Enter a name."); if (kind === "widget" && !fixedExperienceWidgetType) return setError("Choose an experience collection before creating a widget.");
    if (!geoAgent && (kind !== "checklist" || builderMode === "onsite") && source === "manual") { try { const url = new URL(manualUrl); const domain = currentSite.domain ? new URL(/^https?:\/\//.test(currentSite.domain) ? currentSite.domain : `https://${currentSite.domain}`) : null; if (!domain || url.origin !== domain.origin) return setError("Enter a URL on this site's configured domain."); } catch { return setError("Enter a valid absolute URL."); } }
    const popup = builderMode === "onsite" ? openLiveEditorPopup() : null; if (builderMode === "onsite" && !popup) return setError("Your browser blocked the on-site builder window. Allow popups for Movcues and try again."); setSaving(true);
    try {
      const experience = await experiencesApi.createExperience(currentOrg.orgId, currentSite.id, { kind, widgetType: kind === "widget" ? fixedExperienceWidgetType : null, builderMode, ...(guidedCapture ? { guideCreation: "guided_capture" as const } : kind === "guide" && builderMode === "onsite" ? { guidePattern } : {}), name: name.trim(), buildPageId: geoAgent || (kind === "checklist" && builderMode !== "onsite") || source === "manual" ? null : source, buildUrl: geoAgent || kind === "checklist" && builderMode !== "onsite" ? null : source === "manual" ? manualUrl : null, template: builderMode === "onsite" ? "blank" : kind === "checklist" ? legacyPreset : "blank", ...(builderMode === "onsite" ? { theme: { source: themeSource, ...(themeSource === "preset" ? { preset: visualPreset } : {}) } } : {}), useBuildPageAsTarget: geoAgent || kind === "checklist" ? false : guidedCapture ? captureTargetPage : targetPage });
      let launchError: string | null = null; if (builderMode === "onsite" && popup) { try { const session = await experiencesApi.createEditorSession(currentOrg.orgId, currentSite.id, experience.id); popup.location.replace(session.launchUrl); popup.focus(); } catch (caught) { popup.close(); launchError = caught instanceof Error ? caught.message : "The on-site builder could not be opened."; } }
      navigate(`/experiences/${experience.id}/edit`, launchError ? { state: { onsiteLaunchError: `${launchError} The draft was created safely; ${guidedCapture ? "use Resume Guided Capture" : "use Open on-site builder"} to try again.` } } : undefined); onOpenChange(false); onCreated?.();
    } catch (caught) { popup?.close(); setError(caught instanceof Error ? caught.message : "Couldn't create the draft."); } finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[calc(100dvh-24px)] max-w-3xl flex-col overflow-hidden p-0"><DialogHeader className="shrink-0 border-b px-5 py-4 pr-12"><DialogTitle className="text-[17px]">Create {singularLabel}</DialogTitle><DialogDescription className="text-[13px]">{geoAgent ? "Create a chatbot that answers from your site’s knowledge." : "Choose a starting point, match your site, then customize it in the existing builder."}</DialogDescription></DialogHeader><div className="grid min-h-0 gap-4 overflow-y-auto p-5">
    <Label className="grid gap-1.5 text-[13px]">Name<Input value={name} onChange={event => setName(event.target.value)} /></Label>
    {kind === "guide" && captureEnabled && <fieldset className="grid gap-2">
      <legend className="mb-1 text-[13px] font-medium">Creation method</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <BuilderChoice active={guidedCapture} onClick={() => setManualCreation(false)} icon={<Sparkles className="mb-2 size-4 text-primary" />} title="Guided Capture" copy="Select elements across your application and have Geo build an editable guide." />
        <BuilderChoice active={!guidedCapture} onClick={() => setManualCreation(true)} icon={<MousePointer2 className="mb-2 size-4 text-primary" />} title="Manual Creation" copy="Build and design guide steps yourself." />
      </div>
    </fieldset>}
    {!geoAgent && !guidedCapture && <fieldset className="grid gap-2"><legend className="mb-1 text-[13px] font-medium">Builder</legend><div className="grid gap-2 sm:grid-cols-2"><BuilderChoice active={builderMode === "grapesjs"} onClick={() => setBuilderMode("grapesjs")} icon={<LayoutDashboard className="mb-2 size-4 text-primary"/>} title="Dashboard Builder" copy="Advanced GrapesJS canvas and detailed HTML/CSS customization."/><BuilderChoice active={builderMode === "onsite"} disabled={!onsiteAvailable} onClick={() => onsiteAvailable && setBuilderMode("onsite")} icon={<MousePointer2 className="mb-2 size-4 text-primary"/>} title="On-site Visual Builder" copy="Start from a template and edit cells on your live application."/></div></fieldset>}
    {builderMode === "onsite" && <section className="grid gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4"/>Visual style</div><div className="grid gap-2 sm:grid-cols-2"><Choice selected={themeSource === "template"} onClick={() => setThemeSource("template")} title="Template defaults" detail="Use the designed palette."/><Choice selected={themeSource === "site"} disabled={!hasSiteTheme} onClick={() => hasSiteTheme && setThemeSource("site")} title="Match my website" detail={hasSiteTheme ? "Use captured site tokens." : "Capture a site theme first."} colors={siteThemeColors ?? undefined}/></div>{themeSource !== "site" && <div className="flex flex-wrap gap-2">{presets.map(preset => <button type="button" key={preset.id} aria-pressed={themeSource === "preset" && visualPreset === preset.id} onClick={() => { setThemeSource("preset"); setVisualPreset(preset.id); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${themeSource === "preset" && visualPreset === preset.id ? "border-primary ring-2 ring-primary/15" : ""}`}><span className="flex">{preset.colors.map(color => <i key={color} className="size-3 rounded-full border" style={{ background: color }}/>)}</span>{preset.label}</button>)}</div>}</section>}
    {!guidedCapture && kind === "guide" && builderMode === "onsite" && <Label className="grid gap-1.5 text-[13px]">First step<select aria-label="First step" className="h-9 w-full rounded-md border bg-input px-3 text-sm" value={guidePattern} onChange={event => setGuidePattern(event.target.value as typeof guidePattern)}><option value="anchored_card">Anchored card</option><option value="modal">Modal</option></select></Label>}
    {!geoAgent && (kind !== "checklist" || builderMode === "onsite") && <><Label className="grid gap-1.5 text-[13px]">Build on page<select className="h-9 w-full rounded-md border bg-input px-3 text-sm" value={source} onChange={event => setSource(event.target.value)}>{pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}<option value="manual">Enter URL manually</option></select></Label>{source === "manual" && <Label className="grid gap-1.5 text-[13px]">Page URL<Input type="url" placeholder="https://app.example.com/dashboard" value={manualUrl} onChange={event => setManualUrl(event.target.value)} /></Label>}<label className="flex items-start gap-2 text-[13px]"><Checkbox checked={guidedCapture ? captureTargetPage : targetPage} onCheckedChange={value => (guidedCapture ? setCaptureTargetPage : setTargetPage)(value === true)} /><span>Use this page as the initial page-targeting rule</span></label></>}
    {kind === "checklist" && builderMode === "grapesjs" && <Label className="grid gap-1.5 text-[13px]">Preset<select className="h-9 w-full rounded-md border bg-input px-3 text-sm" value={legacyPreset} onChange={event => setLegacyPreset(event.target.value as typeof legacyPreset)}><option value="default">Default</option><option value="minimal">Minimal</option><option value="soft">Soft</option><option value="compact">Compact</option></select></Label>}
    {error && <p className="m-0 text-sm text-destructive">{error}</p>}
  </div><DialogFooter className="shrink-0 border-t px-5 py-3"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || readingCatalog} onClick={submit}>{saving ? "Opening…" : guidedCapture ? "Begin Guided Capture" : builderMode === "onsite" ? "Create & open on site" : geoAgent ? "Create Geo Agent" : "Create & open dashboard"}</Button></DialogFooter></DialogContent></Dialog>;
}

function BuilderChoice({ active, disabled, onClick, icon, title, copy }: { active: boolean; disabled?: boolean; onClick: () => void; icon: ReactNode; title: string; copy: string }) { return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`rounded-lg border p-3 text-left ${active ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:bg-muted/50"} disabled:opacity-50`}>{icon}<strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-4 text-muted-foreground">{copy}</span></button>; }
function Choice({ selected, disabled, onClick, title, detail, colors }: { selected: boolean; disabled?: boolean; onClick: () => void; title: string; detail: string; colors?: [string, string, string] }) { return <button type="button" disabled={disabled} aria-pressed={selected} onClick={onClick} className={`rounded-lg border p-2 text-left disabled:opacity-45 ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : ""}`}><strong className="block text-xs">{title}</strong><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{detail}</span>{colors && <span className="mt-2 flex -space-x-1">{colors.map(color => <i key={color} className="size-3 rounded-full border border-background" style={{ background: color }}/>)}</span>}</button>; }

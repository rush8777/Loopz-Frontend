import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movcues/ui";
import { Copy, Globe2, Palette, Plus, Trash2 } from "lucide-react";
import * as api from "../../api/themes";
import { deleteSavedTemplate, listSavedTemplates, type ExperienceTemplateSummary } from "../../api/experiences";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { NoSiteMessage } from "../../components/settings/SettingsShared";
import type { SettingsSection } from "../../components/settings/SettingsModal";
import { isValidThemeTokens, ThemesSettings, ThemeTokenEditor } from "../../components/settings/ThemesSettings";
import type { SavedTheme, SiteThemeResponse, SiteThemeTokens, ThemePresetId, ThemeSelection } from "../../types/themes";
import { ThemePreviewGallery } from "./ThemePreviewGallery";

type Selection = ThemeSelection | { source: "active" };
const builtInNames: Record<ThemePresetId, string> = { minimal: "Minimal", modern: "Modern", soft: "Soft", dark: "Dark" };

export function ThemeStudioPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const openSettings = useOutletContext<(section: SettingsSection) => void>();
  return <div className="space-y-6 pt-1">
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">Themes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Design reusable styles and see how they look across your experiences.</p>
    </header>
    {currentOrg && currentSite ? <Studio key={`${currentOrg.orgId}:${currentSite.id}`} orgId={currentOrg.orgId} siteId={currentSite.id}
      siteName={currentSite.name} canManage={currentOrg.role === "ADMIN" || currentOrg.role === "OWNER"} openSites={() => openSettings("sites")}/> : <NoSiteMessage/>}
  </div>;
}

function Studio({ orgId, siteId, siteName, canManage, openSites }: {
  orgId: string; siteId: string; siteName: string; canManage: boolean; openSites: () => void;
}) {
  const [data, setData] = useState<SiteThemeResponse | null>(null);
  const [saved, setSaved] = useState<SavedTheme[]>([]);
  const [layouts, setLayouts] = useState<ExperienceTemplateSummary[]>([]);
  const [layoutToDelete, setLayoutToDelete] = useState<string | null>(null);
  const [selection, select] = useState<Selection>({ source: "active" });
  const [draft, setDraft] = useState<{ id?: string; name: string; tokens: SiteThemeTokens } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [version, refresh] = useState(0);
  useEffect(() => {
    let current = true;
    void Promise.all([api.getSiteTheme(orgId, siteId), api.listSavedThemes(orgId, siteId), listSavedTemplates(orgId, siteId)]).then(([themes, library, templates]) => {
      if (!current) return;
      setData(themes);
      setSaved(library.presets);
      setLayouts(templates.templates);
      setError(null);
    }).catch(() => { if (current) setError("Couldn't load themes for this site."); });
    return () => { current = false; };
  }, [orgId, siteId, version]);

  const savedTheme = selection.source === "saved" ? saved.find(theme => theme.id === selection.presetId) : undefined;
  const tokens = draft?.tokens ?? (selection.source === "preset" ? data?.builtIn[selection.preset] : savedTheme?.tokens ?? data?.active?.tokens ?? data?.builtIn.modern);
  const selectionValue = selection.source === "active" ? "active" : selection.source === "preset" ? `preset:${selection.preset}` : `saved:${selection.presetId}`;
  const currentDraft = draft;
  const validDraft = Boolean(currentDraft && currentDraft.name.trim() && isValidThemeTokens(currentDraft.tokens));

  async function change(work: () => Promise<void>, message: string) {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await work();
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "style_preset_name_exists"
        ? "A saved theme already uses this name." : "The change couldn't be saved. Try again.");
    } finally { setBusy(false); }
  }

  function choose(value: string) {
    setConfirmDelete(false);
    setNotice("");
    if (value.startsWith("preset:")) select({ source: "preset", preset: value.slice(7) as ThemePresetId });
    else if (value.startsWith("saved:")) select({ source: "saved", presetId: value.slice(6) });
    else select({ source: "active" });
  }

  function save() {
    if (!currentDraft || !validDraft) return;
    void change(async () => {
      const { preset } = await api.saveTheme(orgId, siteId, { name: currentDraft.name.trim(), tokens: currentDraft.tokens }, currentDraft.id);
      setSaved(list => [preset, ...list.filter(theme => theme.id !== preset.id)]);
      select({ source: "saved", presetId: preset.id });
      setDraft(null);
    }, "Theme saved.");
  }

  function activate(source: ThemeSelection | { source: "none" }) {
    void change(async () => {
      const { active } = await api.setDefaultTheme(orgId, siteId, source);
      setData(current => current && { ...current, active });
      select({ source: "active" });
    }, source.source === "none" ? "Site default cleared." : "Site default activated for new experiences.");
  }

  function remove() {
    if (!savedTheme) return;
    void change(async () => {
      await api.deleteTheme(orgId, siteId, savedTheme.id);
      setSaved(list => list.filter(theme => theme.id !== savedTheme.id));
      select({ source: "active" });
      setConfirmDelete(false);
    }, "Saved theme deleted.");
  }

  return <div className="space-y-5">
    {error && <Alert role="alert" className="border-destructive/25 text-destructive">{error}</Alert>}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">Loading themes…</p>}
    {data && tokens && <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(250px,310px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2"><Palette aria-hidden className="size-4 text-primary"/><h2 className="font-semibold">{siteName}</h2></div>
          <Label className="grid gap-2">Preview theme
            <select className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm" value={selectionValue} disabled={busy || Boolean(draft)} onChange={event => choose(event.target.value)}>
              <option value="active">Site default{data.active ? "" : " · template defaults"}</option>
              <optgroup label="Built-in">{Object.entries(builtInNames).map(([id, name]) => <option key={id} value={`preset:${id}`}>{name}</option>)}</optgroup>
              {saved.length > 0 && <optgroup label="Saved themes">{saved.map(theme => <option key={theme.id} value={`saved:${theme.id}`}>{theme.name}</option>)}</optgroup>}
            </select>
          </Label>
          <div className="flex flex-wrap gap-2" aria-label="Theme colors">
            {Object.entries(tokens.colors).map(([name, color]) => <span key={name} title={`${name}: ${color}`} className="size-6 rounded-full border shadow-sm" style={{ background: color }}/>)}
          </div>
          {selection.source === "active" && <p className="text-xs text-muted-foreground">{data.active ? `Active snapshot · ${new Date(data.active.updatedAt).toLocaleDateString()}` : "New experiences inherit their template palette."}</p>}
          {canManage && !draft && <div className="flex flex-wrap gap-2">
            {selection.source === "active" && <Button size="sm" onClick={() => setDraft({ name: "", tokens })}><Plus/>New theme</Button>}
            {selection.source !== "active" && <Button size="sm" onClick={() => activate(selection)} disabled={busy}>Activate as default</Button>}
            {savedTheme && <Button size="sm" variant="outline" onClick={() => setDraft({ id: savedTheme.id, name: savedTheme.name, tokens })}>Edit theme</Button>}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft({ name: savedTheme ? `${savedTheme.name.slice(0, 75)} copy` : "", tokens })}><Copy/>{selection.source === "active" ? "Save a copy" : "Duplicate"}</Button>
            {data.active && selection.source === "active" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => activate({ source: "none" })}>Clear default</Button>}
            {savedTheme && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}><Trash2/>Delete</Button>}
          </div>}
          {confirmDelete && !draft && <div className="space-y-2 rounded-md border border-destructive/30 p-3 text-sm">
            <p>Delete {savedTheme?.name}? Copies already used by experiences or the site default are retained.</p>
            <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>Delete saved theme</Button>
          </div>}
        </section>
        <details className="rounded-xl border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium"><Globe2 className="size-4 text-primary"/>Import from website</summary>
          <div className="border-t p-3"><ThemesSettings onOpenSites={openSites} onActivated={() => {
            select({ source: "active" }); refresh(count => count + 1); setNotice("Imported theme activated for new experiences.");
          }} renderPreview={value => <ThemePreviewGallery orgId={orgId} siteId={siteId} tokens={value} imported/>}/></div>
        </details>
      </div>
      <div className="min-w-0 space-y-5">
        {currentDraft && <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="font-semibold">{currentDraft.id ? "Edit saved theme" : "New theme draft"}</h2>
            <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Discard</Button><Button size="sm" disabled={busy || !validDraft} onClick={save}>Save theme</Button></div>
          </div>
          <Label className="grid gap-2 px-4 pt-4">Theme name<Input maxLength={80} value={currentDraft.name} onChange={event => setDraft({ ...currentDraft, name: event.target.value })}/></Label>
          <ThemeTokenEditor tokens={tokens} onChange={value => setDraft({ ...currentDraft, tokens: value })}/>
        </section>}
        <ThemePreviewGallery orgId={orgId} siteId={siteId} tokens={tokens}/>
        <details className="rounded-xl border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Saved experience templates</summary>
          {layouts.length ? <ul className="divide-y border-t">{layouts.map(layout => <li key={layout.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div><div className="font-medium">{layout.name}</div><div className="text-xs capitalize text-muted-foreground">{(layout.widgetType ?? layout.category).replaceAll("_", " ")}</div></div>
            {canManage && (layoutToDelete === layout.id ? <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setLayoutToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => void change(async () => {
                await deleteSavedTemplate(orgId, siteId, layout.id);
                setLayouts(items => items.filter(item => item.id !== layout.id));
                setLayoutToDelete(null);
              }, "Template deleted.")}>Delete template</Button>
            </div> : <Button size="sm" variant="ghost" disabled={busy} onClick={() => setLayoutToDelete(layout.id)} aria-label={`Delete template ${layout.name}`}><Trash2/></Button>)}
          </li>)}</ul> : <p className="border-t px-4 py-3 text-sm text-muted-foreground">Save a structured design from an experience to reuse its layout.</p>}
        </details>
      </div>
    </div>}
  </div>;
}

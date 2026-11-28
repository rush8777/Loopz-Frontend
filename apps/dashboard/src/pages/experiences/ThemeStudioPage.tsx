import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movcues/ui";
import { Copy, Palette, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import * as api from "../../api/themes";
import { deleteSavedTemplate, listSavedTemplates, type ExperienceTemplateSummary } from "../../api/experiences";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { NoSiteMessage } from "../../components/settings/SettingsShared";
import type { SettingsSection } from "../../components/settings/SettingsModal";
import { colorPickerValue, isValidThemeTokens, themeComponentNames } from "../../components/settings/ThemesSettings";
import type { ImportedDesign, SavedTheme, SiteThemeResponse, SiteThemeTokens, ThemeComponent, ThemePresetId, ThemeProposal, ThemeSelection } from "../../types/themes";
import { ThemeControls } from "./ThemeControls";
import { ThemeGeo } from "./ThemeGeo";
import { ThemeImport } from "./ThemeImport";
import { ThemePreviewGallery } from "./ThemePreviewGallery";

type Selection = ThemeSelection | { source: "active" };
type Draft = {
  key: number;
  name: string;
  tokens: SiteThemeTokens;
  undo: SiteThemeTokens[];
  redo: SiteThemeTokens[];
  revision: number;
  saved?: SavedTheme;
  importId?: string;
  sourcePresetId?: string;
  sourceFallback?: boolean;
  imported?: ImportedDesign;
};
const builtInNames: Record<ThemePresetId, string> = { minimal: "Minimal", modern: "Modern", soft: "Soft", dark: "Dark" };

function previewContrast(foreground: string, background: string): number | undefined {
  if (![foreground, background].every(color => /^(#[\da-f]{3}|#[\da-f]{6}|rgb\()/i.test(color))) return;
  const luminance = (value: string) => {
    const hex = colorPickerValue(value);
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return r * .2126 + g * .7152 + b * .0722;
  };
  const [a, b] = [luminance(foreground), luminance(background)].sort((first, second) => second - first);
  return (a + .05) / (b + .05);
}

function designWarnings(tokens: SiteThemeTokens, focus: ThemeComponent | null) {
  const style = focus ? tokens.components?.[focus] : undefined;
  const disclaimer = [];
  const palette = { ...tokens.colors };
  palette.text = style?.text ?? palette.text;
  palette.background = style?.background ?? palette.background;
  palette.surface = style?.surface ?? palette.surface;
  const button = tokens.shared?.primaryButton;
  const checks = [
    [palette.text, palette.background],
    [palette.text, palette.surface],
    [palette.mutedText, palette.surface],
    [button?.foreground ?? palette.primaryForeground, button?.background ?? palette.primary],
  ];
  if (checks.some(([foreground, background]) => (previewContrast(foreground, background) ?? 4.5) < 4.5)) disclaimer.push("Some text falls below 4.5:1 contrast.");
  const heading = style?.headingFontSize ?? tokens.typography.headingFontSize;
  const body = style?.bodyFontSize ?? tokens.typography.bodyFontSize;
  if (body < 12 || heading < body || (style?.bodyLineHeight ?? tokens.typography.bodyLineHeight) < 1.25) disclaimer.push("Review font sizes and line heights for readability.");
  if (Object.entries(tokens.shared ?? {}).some(([id, style]) => id !== "progress" && style.minHeight !== undefined && style.minHeight < 24)) disclaimer.push("Some controls have a minimum height below 24 px.");
  return disclaimer.join(" ");
}

export function ThemeStudioPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const openSettings = useOutletContext<(section: SettingsSection) => void>();
  return <div className="space-y-5 pt-1">
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">Theme Studio</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Design reusable styles for your in-app experiences.</p>
    </header>
    {currentOrg && currentSite ? <Studio key={`${currentOrg.orgId}:${currentSite.id}`} orgId={currentOrg.orgId} siteId={currentSite.id}
      siteName={currentSite.name} domain={currentSite.domain} canManage={currentOrg.role === "ADMIN" || currentOrg.role === "OWNER"}
      openSites={() => openSettings("sites")}/> : <NoSiteMessage/>}
  </div>;
}

function Studio({ orgId, siteId, siteName, domain, canManage, openSites }: {
  orgId: string; siteId: string; siteName: string; domain: string | null; canManage: boolean; openSites: () => void;
}) {
  const [data, setData] = useState<SiteThemeResponse | null>(null);
  const [saved, setSaved] = useState<SavedTheme[]>([]);
  const [layouts, setLayouts] = useState<ExperienceTemplateSummary[]>([]);
  const [layoutToDelete, setLayoutToDelete] = useState<string | null>(null);
  const [selection, select] = useState<Selection>({ source: "active" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftKey = useRef(0);
  const [focus, setFocus] = useState<ThemeComponent | null>(null);
  const [proposal, setProposal] = useState<ThemeProposal | null>(null);
  const [geoOpen, setGeoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let current = true;
    void Promise.all([api.getSiteTheme(orgId, siteId), api.listSavedThemes(orgId, siteId), listSavedTemplates(orgId, siteId)]).then(([themes, library, templates]) => {
      if (!current) return;
      setData(themes);
      setSaved(library.presets);
      setLayouts(templates.templates);
    }).catch(() => { if (current) setError("Themes couldn’t be loaded for this site."); });
    return () => { current = false; };
  }, [orgId, siteId]);

  const savedTheme = selection.source === "saved" ? saved.find(theme => theme.id === selection.presetId) : undefined;
  const tokens = draft?.tokens ?? (selection.source === "preset" ? data?.builtIn[selection.preset] : savedTheme?.tokens ?? data?.active?.tokens ?? data?.builtIn.modern);
  const selectionValue = selection.source === "active" ? "active" : selection.source === "preset" ? `preset:${selection.preset}` : `saved:${selection.presetId}`;
  const valid = !!draft && isValidThemeTokens(draft.tokens);
  const warning = valid && draft ? designWarnings(draft.tokens, focus) : "";
  const comparison = proposal?.revision === draft?.revision ? proposal?.tokens : undefined;

  async function change(work: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try { await work(); setNotice(message); }
    catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(code === "style_preset_name_exists" ? "A saved theme already uses this name."
        : code === "style_preset_conflict" ? "Someone saved a newer version of this theme. Save your draft as a new theme to keep your edits."
          : "The change couldn’t be saved. Try again.");
    } finally { setBusy(false); }
  }

  function choose(value: string) {
    setConfirmDelete(false);
    setNotice("");
    if (value.startsWith("preset:")) select({ source: "preset", preset: value.slice(7) as ThemePresetId });
    else if (value.startsWith("saved:")) select({ source: "saved", presetId: value.slice(6) });
    else select({ source: "active" });
  }

  function begin(tokens: SiteThemeTokens, name: string, saved?: SavedTheme, importId?: string, imported?: ImportedDesign, sourcePresetId?: string, sourceFallback?: boolean) {
    const key = ++draftKey.current;
    setProposal(null);
    setDraft({ key, name, tokens, saved, importId, imported, sourcePresetId, sourceFallback, undo: [], redo: [], revision: 0 });
    if (importId && !imported) {
      void api.getImportedDesign(orgId, siteId, importId).then(design => {
        const original = design.status === "ready" ? design.proposal : design.status === "failed"
          ? { tokens: design.fallback, explanation: "Component defaults adapted to the captured styles.", assumptions: [] } : undefined;
        setDraft(current => current?.key === key ? { ...current, imported: original } : current);
      }).catch(() => {});
    }
  }

  function startEditing(value: SiteThemeTokens, duplicate = false) {
    if (draft) return;
    const name = savedTheme ? duplicate ? `${savedTheme.name.slice(0, 75)} copy` : savedTheme.name
      : selection.source === "preset" ? `${builtInNames[selection.preset]} copy` : "";
    begin(value, name, !duplicate ? savedTheme : undefined, savedTheme?.sourceCaptureId ?? undefined, savedTheme?.sourceDesign ?? undefined, savedTheme?.id);
  }

  function updateDraft(value: SiteThemeTokens, expectedRevision?: number) {
    setDraft(current => {
      if (!current || expectedRevision !== undefined && current.revision !== expectedRevision) return current;
      return { ...current, tokens: value, undo: [...current.undo.slice(-39), current.tokens], redo: [], revision: current.revision + 1 };
    });
  }

  function moveHistory(direction: "undo" | "redo") {
    setDraft(current => {
      if (!current) return null;
      const tokens = current[direction].at(-1);
      if (!tokens) return current;
      const inverse = direction === "undo" ? "redo" : "undo";
      return { ...current, tokens, [direction]: current[direction].slice(0, -1), [inverse]: [...current[inverse], current.tokens], revision: current.revision + 1 };
    });
  }

  function save(asCopy = false) {
    if (!draft || !valid || !draft.name.trim()) return;
    const existing = asCopy ? undefined : draft.saved;
    const name = asCopy && draft.saved?.name === draft.name.trim() ? `${draft.name.trim().slice(0, 75)} copy` : draft.name.trim();
    void change(async () => {
      const origin = draft.sourcePresetId ? { sourcePresetId: draft.sourcePresetId }
        : { sourceCaptureId: draft.importId, sourceFallback: draft.sourceFallback };
      const { preset } = await api.saveTheme(orgId, siteId, {
        name, tokens: draft.tokens,
        ...(existing ? { expectedUpdatedAt: existing.updatedAt } : origin),
      }, existing?.id);
      setSaved(list => [preset, ...list.filter(theme => theme.id !== preset.id)]);
      select({ source: "saved", presetId: preset.id });
      setDraft(null);
      setProposal(null);
    }, "Theme saved.");
  }

  function activate(source: ThemeSelection | { source: "none" }) {
    void change(async () => {
      const { active } = await api.setDefaultTheme(orgId, siteId, source);
      setData(current => current && { ...current, active });
      select({ source: "active" });
    }, source.source === "none" ? "Site default cleared." : "Site default set for new experiences.");
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

  const compareProposal = useCallback((value: ThemeProposal | null) => {
    if (value) setFocus(current => value.scope in themeComponentNames ? value.scope as ThemeComponent : current ?? "modal");
    setProposal(value);
  }, []);

  return <div className="space-y-4">
    {error && <Alert role="alert" className="border-destructive/25 text-destructive">{error}</Alert>}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {!data && !error && <p role="status" className="text-sm text-muted-foreground">Loading themes…</p>}
    {data && tokens && <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(245px,286px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <section className="rounded-xl border bg-card">
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center gap-2"><Palette aria-hidden className="size-4 text-primary"/><h2 className="font-semibold">{siteName}</h2></div>
            <Label className="grid gap-1.5">Theme
              <select className="w-full min-w-0 rounded-md border bg-background px-2.5 py-2 text-sm" value={selectionValue} disabled={busy || !!draft} onChange={event => choose(event.target.value)}>
                <option value="active">Site default{data.active ? "" : " · template defaults"}</option>
                <optgroup label="Built-in">{Object.entries(builtInNames).map(([id, name]) => <option key={id} value={`preset:${id}`}>{name}</option>)}</optgroup>
                {!!saved.length && <optgroup label="Saved themes">{saved.map(theme => <option key={theme.id} value={`saved:${theme.id}`}>{theme.name}</option>)}</optgroup>}
              </select>
            </Label>
            <div className="flex flex-wrap gap-1.5" aria-label="Theme colors">
              {Object.entries(tokens.colors).map(([name, color]) => <span key={name} title={`${name} ${color}`} className="size-5 rounded-full border" style={{ background: color }}/>)}
            </div>
            {canManage && !draft && <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={busy} onClick={() => startEditing(tokens)}>{savedTheme ? "Edit theme" : <><Plus/>New theme</>}</Button>
              {selection.source !== "active" && <Button size="sm" variant="outline" disabled={busy} onClick={() => activate(selection)}>Set as site default</Button>}
              {savedTheme && <Button size="sm" variant="ghost" disabled={busy} onClick={() => startEditing(tokens, true)}><Copy/>Duplicate</Button>}
              {data.active && selection.source === "active" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => activate({ source: "none" })}>Clear default</Button>}
              {savedTheme && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)} aria-label="Delete saved theme"><Trash2/></Button>}
            </div>}
            {confirmDelete && !draft && <div className="space-y-2 rounded-md border border-destructive/30 p-3 text-sm">
              <p>Delete {savedTheme?.name}? Experiences that use this theme keep their saved styles.</p>
              <Button size="sm" variant="destructive" disabled={busy} onClick={remove}>Delete theme</Button>
            </div>}
          </div>
          {canManage && <ThemeImport orgId={orgId} siteId={siteId} domain={domain} resumableId={data.candidate?.captureId} hasDraft={!!draft} openSites={openSites}
            onReview={(captureId, imported, replaceDraft, fallback) => {
              if (busy || draft && !replaceDraft) return false;
              begin(imported.tokens, `${siteName.slice(0, 65)} theme`, undefined, captureId, imported, undefined, fallback);
              setFocus(null);
              setGeoOpen(false);
              return true;
            }}/>}
        </section>

        {draft && <section className="min-w-0 rounded-xl border bg-card">
          <fieldset disabled={busy} className="min-w-0">
          <div className="space-y-3 px-4 py-4">
            <h2 className="font-semibold">Edit design</h2>
            <Label className="grid gap-1.5">Theme name
              <Input maxLength={80} value={draft.name} onChange={event => {
                const name = event.target.value;
                setDraft(current => current && { ...current, name });
              }}/>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={busy || !valid || !draft.name.trim()} onClick={() => save()}>{draft.saved ? "Save changes" : "Save theme"}</Button>
              {draft.saved && <Button size="sm" variant="outline" disabled={busy || !valid || !draft.name.trim()} onClick={() => save(true)}>Save as new</Button>}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setDraft(null); setProposal(null); }}>Discard draft</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" disabled={!draft.undo.length} onClick={() => moveHistory("undo")}><Undo2/>Undo</Button>
              <Button variant="ghost" size="sm" disabled={!draft.redo.length} onClick={() => moveHistory("redo")}><Redo2/>Redo</Button>
              {draft.imported && <Button variant="ghost" size="sm" onClick={() => updateDraft(draft.imported!.tokens)}>Restore imported design</Button>}
            </div>
            {!valid && <p role="alert" className="text-xs text-destructive">Correct the highlighted values before saving or asking Geo.</p>}
            {warning && <p role="status" className="text-xs text-muted-foreground">{warning}</p>}
          </div>
          <ThemeControls tokens={draft.tokens} onChange={updateDraft} focus={focus}/>
          </fieldset>
        </section>}
        {canManage && <ThemeGeo key={draft?.key ?? "idle"} orgId={orgId} siteId={siteId} tokens={tokens} revision={draft?.revision ?? -1}
          disabled={!valid || busy} expanded={geoOpen} toggle={() => {
            if (!draft) startEditing(tokens);
            setGeoOpen(value => !value);
          }} onApply={value => updateDraft(value.tokens, value.revision)} onCompare={compareProposal}/>}
      </div>

      <div className="min-w-0 space-y-4">
        {draft?.imported && <section className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm" aria-label="Imported design summary">
          <p className="font-medium">Imported design draft</p>
          <p className="mt-1 text-muted-foreground">{draft.imported.explanation}</p>
          {!!draft.imported.assumptions.length && <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{draft.imported.assumptions.map((value, index) => <li key={index}>{value}</li>)}</ul>}
        </section>}
        <ThemePreviewGallery orgId={orgId} siteId={siteId} tokens={tokens} focus={focus} setFocus={setFocus} comparison={comparison}/>
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
          </li>)}</ul> : <p className="border-t px-4 py-3 text-sm text-muted-foreground">Save an experience as a template to reuse its layout.</p>}
        </details>
      </div>
    </div>}
  </div>;
}

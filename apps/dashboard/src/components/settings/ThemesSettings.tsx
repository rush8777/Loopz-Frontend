import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Input, Label } from "@movcues/ui";
import { LoaderCircle, Palette, RefreshCw } from "lucide-react";
import * as themesApi from "../../api/themes";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { SiteThemeResponse, SiteThemeTokens, ThemeCaptureStatus, ThemeComponent } from "../../types/themes";
import { NoSiteMessage, SettingsGroup } from "./SettingsShared";

const wait = () => new Promise<void>(resolve => window.setTimeout(resolve, 1_000));
const cloneTokens = (tokens: SiteThemeTokens) => JSON.parse(JSON.stringify(tokens)) as SiteThemeTokens;
const safeColor = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s-]+\)|[a-z]{1,20})$/i;

const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

export function isValidThemeTokens(tokens: SiteThemeTokens): boolean {
  const typography = tokens.typography;
  return Object.values(tokens.colors).every(value => safeColor.test(value.trim()))
    && [typography.bodyFontFamily, typography.headingFontFamily].every(value => value.trim() && value.length <= 200 && !/[{};@]|url\s*\(/i.test(value))
    && inRange(typography.bodyFontSize, 8, 72)
    && inRange(typography.headingFontSize, 10, 160)
    && [typography.bodyFontWeight, typography.headingFontWeight].every(value => Number.isInteger(value) && inRange(value, 100, 900))
    && [typography.bodyLineHeight, typography.headingLineHeight].every(value => inRange(value, 0.8, 3))
    && Object.values(tokens.radii).every(value => inRange(value, 0, 100))
    && (tokens.spacing === undefined || inRange(tokens.spacing, 0, 64))
    && Object.values(tokens.components ?? {}).every(component =>
      (component.spacing === undefined || inRange(component.spacing, 0, 64))
      && [component.radius, component.buttonRadius].every(value => value === undefined || inRange(value, 0, 100)))
    && Object.values(tokens.shadows).every(value => safeColor.test(value.color.trim())
      && inRange(value.x, -100, 100)
      && inRange(value.y, -100, 100)
      && inRange(value.blur, 0, 200)
      && inRange(value.spread, -100, 100));
}

export function isTerminalThemeCaptureStatus(status: ThemeCaptureStatus): boolean {
  return status === "received" || status === "expired" || status === "origin_mismatch";
}

export function colorPickerValue(value: string): string {
  const trimmed = value.trim();
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(trimmed);
  if (hex) return `#${hex[1]}`;
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])(?:[0-9a-f])?$/i.exec(trimmed);
  if (shortHex) return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  const rgb = /^rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/i.exec(trimmed);
  if (!rgb) return "#000000";
  const percent = trimmed.slice(0, trimmed.indexOf(")")).includes("%");
  const channel = (raw: string) => Math.round(Math.min(255, Math.max(0, Number(raw) * (percent ? 2.55 : 1)))).toString(16).padStart(2, "0");
  return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
}

function contrast(hexA: string, hexB: string): number | null {
  const parse = (value: string) => { const match = /^#([0-9a-f]{6})$/i.exec(colorPickerValue(value)); if (!match) return null; const channels = [0, 2, 4].map(offset => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255).map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722; };
  const a = parse(hexA); const b = parse(hexB); return a === null || b === null ? null : (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export const themeComponentNames: Record<ThemeComponent, string> = {
  modal: "Modal", anchored_card: "Anchored card", survey: "Survey", checklist: "Checklist",
  banner: "Banner", slideout: "Slideout", toast: "Toast", hotspot: "Hotspot",
  cursor_follow: "Cursor follower", guide: "Guide tooltip",
};

export function ThemeTokenEditor({ tokens, onChange }: { tokens: SiteThemeTokens; onChange: (tokens: SiteThemeTokens) => void }) {
  const [component, setComponent] = useState<ThemeComponent>("modal");
  const setColor = (key: keyof SiteThemeTokens["colors"], value: string) => onChange({ ...tokens, colors: { ...tokens.colors, [key]: value } });
  const setTypography = (key: keyof SiteThemeTokens["typography"], value: string) => onChange({ ...tokens, typography: { ...tokens.typography, [key]: key.includes("Family") ? value : Number(value) } });
  const setShadow = (size: keyof SiteThemeTokens["shadows"], key: keyof SiteThemeTokens["shadows"]["sm"], value: string) => onChange({ ...tokens, shadows: { ...tokens.shadows, [size]: { ...tokens.shadows[size], [key]: key === "color" ? value : Number(value) } } });
  return <div className="space-y-4 p-3.5">
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Colors</div><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(tokens.colors) as Array<keyof SiteThemeTokens["colors"]>).map(key => <Label key={key} className="grid gap-1 capitalize">{key.replace(/([A-Z])/g, " $1")}<div className="flex gap-2"><input aria-label={`${key} color picker`} type="color" value={colorPickerValue(tokens.colors[key])} onChange={event => setColor(key, event.target.value)} className="h-9 w-10 rounded border bg-transparent p-1"/><Input aria-label={`${key} color value`} value={tokens.colors[key]} onChange={event => setColor(key, event.target.value)}/></div></Label>)}</div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Typography</div><div className="grid gap-3 sm:grid-cols-2">{(["bodyFontFamily", "headingFontFamily"] as const).map(key => <Label key={key} className="grid gap-1">{key === "bodyFontFamily" ? "Body font" : "Heading font"}<Input value={tokens.typography[key]} onChange={event => setTypography(key, event.target.value)}/></Label>)}{(["bodyFontSize", "headingFontSize", "bodyFontWeight", "headingFontWeight", "bodyLineHeight", "headingLineHeight"] as const).map(key => <Label key={key} className="grid gap-1 capitalize">{key.replace(/([A-Z])/g, " $1")}<Input type="number" step={key.includes("LineHeight") ? ".05" : "1"} value={tokens.typography[key]} onChange={event => setTypography(key, event.target.value)}/></Label>)}</div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Shape and spacing</div><div className="grid grid-cols-2 gap-3">{(["sm", "md", "lg"] as const).map(key => <Label key={key} className="grid gap-1">{{ sm: "Small radius", md: "Button radius", lg: "Card radius" }[key]}<Input type="number" min="0" max="100" value={tokens.radii[key]} onChange={event => onChange({ ...tokens, radii: { ...tokens.radii, [key]: Number(event.target.value) } })}/></Label>)}
      <Label className="grid gap-1">Default spacing<Input type="number" min="0" max="64" placeholder="Inherited" value={tokens.spacing ?? ""} onChange={event => onChange({ ...tokens, spacing: event.target.value === "" ? undefined : event.target.valueAsNumber })}/></Label>
    </div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Shadows</div>{(["sm", "md"] as const).map(size => <div key={size} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Label className="grid gap-1 uppercase">{size} color<Input value={tokens.shadows[size].color} onChange={event => setShadow(size, "color", event.target.value)}/></Label>{(["x", "y", "blur", "spread"] as const).map(key => <Label key={key} className="grid gap-1 capitalize">{key}<Input type="number" value={tokens.shadows[size][key]} onChange={event => setShadow(size, key, event.target.value)}/></Label>)}</div>)}</div>
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">Component defaults</summary>
      <Label className="mt-3 grid gap-2">Component
        <select className="rounded-md border bg-background px-3 py-2" value={component} onChange={event => setComponent(event.target.value as ThemeComponent)}>
          {Object.entries(themeComponentNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </Label>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(["spacing", "radius", "buttonRadius"] as const).map(key => <Label key={key} className="grid gap-1">
          {{ spacing: "Spacing", radius: "Card radius", buttonRadius: "Button radius" }[key]}
          <Input type="number" min="0" max={key === "spacing" ? 64 : 100} placeholder="Inherited" value={tokens.components?.[component]?.[key] ?? ""}
            onChange={event => onChange({ ...tokens, components: { ...tokens.components, [component]: { ...tokens.components?.[component], [key]: event.target.value === "" ? undefined : event.target.valueAsNumber } } })}/>
        </Label>)}
      </div>
    </details>
  </div>;
}

export function ThemesSettings({ onOpenSites, onActivated, renderPreview }: {
  onOpenSites: () => void;
  onActivated: () => void;
  renderPreview: (tokens: SiteThemeTokens) => ReactNode;
}) {
  const { currentOrg, currentSite } = useWorkspace();
  const [data, setData] = useState<SiteThemeResponse | null>(null); const [draft, setDraft] = useState<SiteThemeTokens | null>(null); const [original, setOriginal] = useState<SiteThemeTokens | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const attempt = useRef(0);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";
  const load = useCallback(async (requestId: number) => { if (!currentOrg || !currentSite) return; try { const result = await themesApi.getSiteTheme(currentOrg.orgId, currentSite.id); if (attempt.current !== requestId) return; setData(result); if (result.candidate) { setDraft(cloneTokens(result.candidate.tokens)); setOriginal(cloneTokens(result.candidate.tokens)); } else { setDraft(null); setOriginal(null); } setError(null); } catch { if (attempt.current === requestId) setError("Couldn't load this site's theme."); } }, [currentOrg, currentSite]);
  useEffect(() => { const requestId = ++attempt.current; setBusy(false); setError(null); setData(null); setDraft(null); setOriginal(null); void load(requestId); return () => { if (attempt.current === requestId) attempt.current += 1; }; }, [load]);
  async function scan() { if (!currentOrg || !currentSite || !canManage) return; const current = ++attempt.current; setBusy(true); setError(null); try { const created = await themesApi.createThemeCapture(currentOrg.orgId, currentSite.id); if (attempt.current !== current) return; setData(value => value ? { ...value, capture: created.capture } : value); while (attempt.current === current) { const result = await themesApi.getThemeCapture(currentOrg.orgId, currentSite.id, created.capture.id); if (attempt.current !== current) break; setData(value => value ? { ...value, capture: result.capture } : value); if (isTerminalThemeCaptureStatus(result.capture.status)) { await load(current); break; } await wait(); } } catch { if (attempt.current === current) setError("The theme scan couldn't be started. Check the primary domain and try again."); } finally { if (attempt.current === current) setBusy(false); } }
  async function activate() { if (!currentOrg || !currentSite || !draft || !data?.candidate || !canManage) return; const current = ++attempt.current; setBusy(true); try { await themesApi.activateTheme(currentOrg.orgId, currentSite.id, data.candidate.captureId, draft); await load(current); if (attempt.current === current) onActivated(); } catch { if (attempt.current === current) setError("Check the token values and try activating again."); } finally { if (attempt.current === current) setBusy(false); } }
  async function discard() { if (!currentOrg || !currentSite || !canManage) return; const current = ++attempt.current; setBusy(true); try { await themesApi.discardThemeCandidate(currentOrg.orgId, currentSite.id); await load(current); } catch { if (attempt.current === current) setError("Couldn't discard the candidate theme."); } finally { if (attempt.current === current) setBusy(false); } }
  const textContrast = draft ? contrast(draft.colors.text, draft.colors.background) : null; const buttonContrast = draft ? contrast(draft.colors.primaryForeground, draft.colors.primary) : null;
  const draftValid = draft ? isValidThemeTokens(draft) : false;
  const status = data?.capture;
  return <div>{!currentSite ? <NoSiteMessage/> : <>
    {!currentSite.domain && <Alert className="mb-4"><div className="flex items-center justify-between gap-3"><span>Add a primary domain before scanning so uploads can be verified.</span><Button variant="outline" size="sm" onClick={onOpenSites}>Open Sites</Button></div></Alert>}{error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
    <SettingsGroup title="Website scan"><div className="flex items-center justify-between gap-4 p-3.5"><div><div className="flex items-center gap-2 text-sm font-medium"><Palette className="size-4"/> {status?.status === "pending" ? "Waiting for your website" : status?.status === "origin_mismatch" ? "Opened from a different origin" : status?.status === "expired" ? "Scan expired" : status?.status === "received" ? "Theme received" : "Extract website theme"}{status && <Badge variant="outline">{status.status.replace("_", " ")}</Badge>}</div><p className="mt-1 mb-0 text-xs text-muted-foreground">{status?.status === "pending" || status?.status === "origin_mismatch" ? `Open or refresh ${currentSite.domain} while this scan is running.` : "A scan runs once on the next SDK page load and never collects page content."}</p></div>{canManage && <Button disabled={!currentSite.domain || busy} onClick={() => void scan()}>{busy && status?.status === "pending" ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>}{status ? "Scan again" : "Scan website theme"}</Button>}</div></SettingsGroup>
    {draft && data?.candidate && <SettingsGroup title="Imported theme draft">{draftValid && renderPreview(draft)}{canManage && <ThemeTokenEditor tokens={draft} onChange={setDraft}/>} {!draftValid && <Alert className="m-3 mt-0 border-destructive/25 bg-red-50 text-destructive">Fix invalid token values before activating.</Alert>}{((textContrast !== null && textContrast < 4.5) || (buttonContrast !== null && buttonContrast < 4.5)) && <Alert className="m-3 mt-0">Some text has low contrast. You can still activate the theme, but readability may suffer.</Alert>}<div className="flex flex-wrap gap-2 border-t p-3.5">{canManage && <><Button onClick={() => void activate()} disabled={busy || !draftValid}>Activate as site default</Button><Button variant="outline" onClick={() => original && setDraft(cloneTokens(original))} disabled={busy}>Reset extracted values</Button><Button variant="ghost" onClick={() => void discard()} disabled={busy}>Discard</Button></>}</div><details className="border-t p-3.5 text-xs"><summary className="cursor-pointer font-medium">Extraction evidence and confidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-muted-foreground">{JSON.stringify({ confidence: data.candidate.evidence.confidence, cssVariables: data.candidate.evidence.cssVariables }, null, 2)}</pre></details></SettingsGroup>}
  </>}</div>;
}

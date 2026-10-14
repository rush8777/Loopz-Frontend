import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Input, Label } from "@movcues/ui";
import { LoaderCircle, Palette, RefreshCw } from "lucide-react";
import * as themesApi from "../../api/themes";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { SiteThemeResponse, SiteThemeTokens } from "../../types/themes";
import { NoSiteMessage, SettingsGroup, SettingsHeading } from "./SettingsShared";

const wait = () => new Promise<void>(resolve => window.setTimeout(resolve, 1_000));
const cloneTokens = (tokens: SiteThemeTokens) => JSON.parse(JSON.stringify(tokens)) as SiteThemeTokens;
const safeColor = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s-]+\)|[a-z]{1,20})$/i;
function validTokens(tokens: SiteThemeTokens) { return Object.values(tokens.colors).every(value => safeColor.test(value.trim())) && [tokens.typography.bodyFontFamily, tokens.typography.headingFontFamily].every(value => value.trim() && value.length <= 200 && !/[{};@]|url\s*\(/i.test(value)) && Object.values(tokens.radii).every(value => Number.isFinite(value) && value >= 0 && value <= 100) && Object.values(tokens.shadows).every(value => safeColor.test(value.color) && [value.x, value.y, value.blur, value.spread].every(Number.isFinite)); }

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

function ThemePreview({ tokens }: { tokens: SiteThemeTokens }) {
  return <div className="m-3 rounded-lg border p-5" style={{ background: tokens.colors.background, color: tokens.colors.text, borderColor: tokens.colors.border, borderRadius: tokens.radii.lg, boxShadow: `${tokens.shadows.md.x}px ${tokens.shadows.md.y}px ${tokens.shadows.md.blur}px ${tokens.shadows.md.spread}px ${tokens.shadows.md.color}`, fontFamily: tokens.typography.bodyFontFamily }}>
    <div className="mb-1 text-xs" style={{ color: tokens.colors.mutedText }}>Imported website theme</div>
    <h3 className="m-0" style={{ fontFamily: tokens.typography.headingFontFamily, fontSize: tokens.typography.headingFontSize, fontWeight: tokens.typography.headingFontWeight, lineHeight: tokens.typography.headingLineHeight }}>Build widgets that feel native</h3>
    <p style={{ fontSize: tokens.typography.bodyFontSize, lineHeight: tokens.typography.bodyLineHeight }}>Colors, typography, radii, and shadows are copied into each widget.</p>
    <button type="button" className="border-0 px-4 py-2 font-medium" style={{ background: tokens.colors.primary, color: tokens.colors.primaryForeground, borderRadius: tokens.radii.md }}>Primary action</button>
  </div>;
}

function TokenEditor({ tokens, onChange }: { tokens: SiteThemeTokens; onChange: (tokens: SiteThemeTokens) => void }) {
  const setColor = (key: keyof SiteThemeTokens["colors"], value: string) => onChange({ ...tokens, colors: { ...tokens.colors, [key]: value } });
  const setTypography = (key: keyof SiteThemeTokens["typography"], value: string) => onChange({ ...tokens, typography: { ...tokens.typography, [key]: key.includes("Family") ? value : Number(value) } });
  const setShadow = (size: keyof SiteThemeTokens["shadows"], key: keyof SiteThemeTokens["shadows"]["sm"], value: string) => onChange({ ...tokens, shadows: { ...tokens.shadows, [size]: { ...tokens.shadows[size], [key]: key === "color" ? value : Number(value) } } });
  return <div className="space-y-4 p-3.5">
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Colors</div><div className="grid gap-3 sm:grid-cols-2">{(Object.keys(tokens.colors) as Array<keyof SiteThemeTokens["colors"]>).map(key => <Label key={key} className="grid gap-1 capitalize">{key.replace(/([A-Z])/g, " $1")}<div className="flex gap-2"><input aria-label={`${key} color picker`} type="color" value={colorPickerValue(tokens.colors[key])} onChange={event => setColor(key, event.target.value)} className="h-9 w-10 rounded border bg-transparent p-1"/><Input value={tokens.colors[key]} onChange={event => setColor(key, event.target.value)}/></div></Label>)}</div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Typography</div><div className="grid gap-3 sm:grid-cols-2">{(["bodyFontFamily", "headingFontFamily"] as const).map(key => <Label key={key} className="grid gap-1">{key === "bodyFontFamily" ? "Body font" : "Heading font"}<Input value={tokens.typography[key]} onChange={event => setTypography(key, event.target.value)}/></Label>)}{(["bodyFontSize", "headingFontSize", "bodyFontWeight", "headingFontWeight", "bodyLineHeight", "headingLineHeight"] as const).map(key => <Label key={key} className="grid gap-1 capitalize">{key.replace(/([A-Z])/g, " $1")}<Input type="number" step={key.includes("LineHeight") ? ".05" : "1"} value={tokens.typography[key]} onChange={event => setTypography(key, event.target.value)}/></Label>)}</div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Corner radii</div><div className="grid grid-cols-3 gap-3">{(["sm", "md", "lg"] as const).map(key => <Label key={key} className="grid gap-1 uppercase">{key}<Input type="number" min="0" max="100" value={tokens.radii[key]} onChange={event => onChange({ ...tokens, radii: { ...tokens.radii, [key]: Number(event.target.value) } })}/></Label>)}</div></div>
    <div><div className="mb-2 text-xs font-medium text-muted-foreground">Shadows</div>{(["sm", "md"] as const).map(size => <div key={size} className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5"><Label className="grid gap-1 uppercase">{size} color<Input value={tokens.shadows[size].color} onChange={event => setShadow(size, "color", event.target.value)}/></Label>{(["x", "y", "blur", "spread"] as const).map(key => <Label key={key} className="grid gap-1 capitalize">{key}<Input type="number" value={tokens.shadows[size][key]} onChange={event => setShadow(size, key, event.target.value)}/></Label>)}</div>)}</div>
  </div>;
}

export function ThemesSettings({ onOpenSites }: { onOpenSites: () => void }) {
  const { currentOrg, currentSite } = useWorkspace();
  const [data, setData] = useState<SiteThemeResponse | null>(null); const [draft, setDraft] = useState<SiteThemeTokens | null>(null); const [original, setOriginal] = useState<SiteThemeTokens | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const attempt = useRef(0);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";
  const load = useCallback(async () => { if (!currentOrg || !currentSite) return; try { const result = await themesApi.getSiteTheme(currentOrg.orgId, currentSite.id); setData(result); if (result.candidate) { setDraft(cloneTokens(result.candidate.tokens)); setOriginal(cloneTokens(result.candidate.tokens)); } else { setDraft(null); setOriginal(null); } setError(null); } catch { setError("Couldn't load this site's theme."); } }, [currentOrg, currentSite]);
  useEffect(() => { attempt.current += 1; setData(null); setDraft(null); void load(); return () => { attempt.current += 1; }; }, [load]);
  async function scan() { if (!currentOrg || !currentSite || !canManage) return; const current = ++attempt.current; setBusy(true); setError(null); try { const created = await themesApi.createThemeCapture(currentOrg.orgId, currentSite.id); setData(value => value ? { ...value, capture: created.capture } : value); while (attempt.current === current) { const result = await themesApi.getThemeCapture(currentOrg.orgId, currentSite.id, created.capture.id); setData(value => value ? { ...value, capture: result.capture } : value); if (result.capture.status === "received" || result.capture.status === "expired") { await load(); break; } await wait(); } } catch { setError("The theme scan couldn't be started. Check the primary domain and try again."); } finally { if (attempt.current === current) setBusy(false); } }
  async function activate() { if (!currentOrg || !currentSite || !draft || !data?.candidate || !canManage) return; setBusy(true); try { await themesApi.activateTheme(currentOrg.orgId, currentSite.id, data.candidate.captureId, draft); await load(); } catch { setError("Check the token values and try activating again."); } finally { setBusy(false); } }
  async function discard() { if (!currentOrg || !currentSite || !canManage) return; setBusy(true); try { await themesApi.discardThemeCandidate(currentOrg.orgId, currentSite.id); await load(); } catch { setError("Couldn't discard the candidate theme."); } finally { setBusy(false); } }
  const textContrast = draft ? contrast(draft.colors.text, draft.colors.background) : null; const buttonContrast = draft ? contrast(draft.colors.primaryForeground, draft.colors.primary) : null;
  const draftValid = draft ? validTokens(draft) : false;
  const status = data?.capture;
  return <div><SettingsHeading title="Themes" description="Import your website's visual language into movcues widgets."/>{!currentSite ? <NoSiteMessage/> : <>
    {!currentSite.domain && <Alert className="mb-4"><div className="flex items-center justify-between gap-3"><span>Add a primary domain before scanning so uploads can be verified.</span><Button variant="outline" size="sm" onClick={onOpenSites}>Open Sites</Button></div></Alert>}{error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
    <SettingsGroup title="Website scan"><div className="flex items-center justify-between gap-4 p-3.5"><div><div className="flex items-center gap-2 text-sm font-medium"><Palette className="size-4"/> {status?.status === "pending" ? "Waiting for your website" : status?.status === "origin_mismatch" ? "Opened from a different origin" : status?.status === "expired" ? "Scan expired" : status?.status === "received" ? "Theme received" : "Extract website theme"}{status && <Badge variant="outline">{status.status.replace("_", " ")}</Badge>}</div><p className="mt-1 mb-0 text-xs text-muted-foreground">{status?.status === "pending" || status?.status === "origin_mismatch" ? `Open or refresh ${currentSite.domain} while this scan is running.` : "A scan runs once on the next SDK page load and never collects page content."}</p></div>{canManage && <Button disabled={!currentSite.domain || busy} onClick={() => void scan()}>{busy && status?.status === "pending" ? <LoaderCircle className="animate-spin"/> : <RefreshCw/>}{status ? "Scan again" : "Scan website theme"}</Button>}</div></SettingsGroup>
    {data?.active && <SettingsGroup title="Active theme"><ThemePreview tokens={data.active.tokens}/><div className="border-t px-3.5 py-2 text-xs text-muted-foreground">Updated {new Date(data.active.updatedAt).toLocaleString()}</div></SettingsGroup>}
    {draft && data?.candidate && <SettingsGroup title="Candidate theme"><ThemePreview tokens={draft}/><TokenEditor tokens={draft} onChange={setDraft}/>{!draftValid && <Alert className="m-3 mt-0 border-destructive/25 bg-red-50 text-destructive">Fix invalid color, font, radius, or shadow values before activating.</Alert>}{((textContrast !== null && textContrast < 4.5) || (buttonContrast !== null && buttonContrast < 4.5)) && <Alert className="m-3 mt-0">Some text has low contrast. You can still activate the theme, but readability may suffer.</Alert>}<div className="flex flex-wrap gap-2 border-t p-3.5">{canManage && <><Button onClick={() => void activate()} disabled={busy || !draftValid}>Activate theme</Button><Button variant="outline" onClick={() => original && setDraft(cloneTokens(original))} disabled={busy}>Reset extracted values</Button><Button variant="ghost" onClick={() => void discard()} disabled={busy}>Discard</Button></>}</div><details className="border-t p-3.5 text-xs"><summary className="cursor-pointer font-medium">Extraction evidence and confidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-muted-foreground">{JSON.stringify({ confidence: data.candidate.evidence.confidence, cssVariables: data.candidate.evidence.cssVariables }, null, 2)}</pre></details></SettingsGroup>}
  </>}</div>;
}

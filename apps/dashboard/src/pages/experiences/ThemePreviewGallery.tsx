import { useEffect, useRef, useState } from "react";
import { Button } from "@movcues/ui";
import { ArrowUpRight, LayoutGrid, Monitor, Smartphone } from "lucide-react";
import { getThemePreviews } from "../../api/themes";
import { themeComponentNames, isValidThemeTokens } from "../../components/settings/ThemesSettings";
import type { SiteThemeTokens, ThemeComponent, ThemePreview } from "../../types/themes";
import type { ExperienceTemplateSummary } from "../../api/experiences";
import { localPreviewUrl, previewScript, useLocalPreview } from "./themePreviewScript";

type Bounds = { x: number; y: number; width: number; height: number };
const frameHeight = 660;
const desktopWidth = 900;
const mobileWidth = 390;
const galleryHeights: Record<ThemeComponent, number> = {
  modal: 192, survey: 234, checklist: 226, anchored_card: 192, guide: 192,
  banner: 136, slideout: 192, toast: 144, hotspot: 192, cursor_follow: 168, geo_agent: 234,
};
const allowedScriptOrigin = new URL(previewScript, window.location.href).origin;
const frameDocument = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${allowedScriptOrigin}; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">
<style>
html,body { margin:0; width:100%; height:100%; overflow:hidden; background:#f1f4f9; }
body { font:13px system-ui,sans-serif; color:#344563; }
.workspace { position:absolute; inset:0; display:grid; grid-template-columns:minmax(54px,19%) 1fr; }
aside { background:#f8faff; border-right:1px solid #dbe4f1; padding:24px 12%; display:grid; align-content:start; gap:16px; }
aside i { display:block; height:8px; border-radius:5px; background:#dce5f3; }
aside i:first-child { width:39%; height:20px; background:#b3c6e6; margin-bottom:20px; }
main { padding:27px 6%; }
header { height:28px; border-bottom:1px solid #dce3ee; }
h1 { margin-top:22px; font-size:17px; color:#425876; }
section { margin-top:14px; border:1px solid #dbe4f1; min-height:108px; border-radius:10px; background:#f9fbff; }
#theme-preview-target { position:absolute; top:25%; left:48%; transform:translate(-50%,-50%); padding:8px 12px; border:1px solid #c6d2e5; border-radius:7px; background:white; color:inherit; font:inherit; max-width:36%; }
</style></head><body><div class="workspace" aria-hidden="true"><aside><i></i><i></i><i></i><i></i><i></i></aside><main><header>Workspace</header><h1>Overview</h1><section></section><section></section></main></div><script src="${previewScript}"></script></body></html>`;

function validBounds(value: Bounds | undefined, width: number): value is Bounds {
  return !!value && [value.x, value.y, value.width, value.height].every(Number.isFinite)
    && value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0
    && value.x + value.width <= width && value.y + value.height <= frameHeight;
}

function PreviewFrame({ sample, focused, mobile, label }: { sample: ThemePreview; focused?: boolean; mobile?: boolean; label?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const [loaded, setLoaded] = useState(0);
  const [observedWidth, setWidth] = useState(0);
  const [display, setDisplay] = useState<{ status: "loading" | "ready" | "error"; bounds?: Bounds }>({ status: "loading" });
  const width = mobile ? mobileWidth : focused ? Math.max(740, Math.min(desktopWidth, Math.floor(observedWidth || desktopWidth))) : desktopWidth;
  const height = focused ? frameHeight : galleryHeights[sample.id];

  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([size]) => setWidth(size.contentRect.width));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const renderId = ++generation.current;
    const timeout = window.setTimeout(() => setDisplay(current => current.status === "ready" ? current : { status: "error" }), 9_000);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null" || event.data?.type !== "movcues:theme-preview-rendered"
        || event.data.renderId !== renderId || !validBounds(event.data.bounds, width)) return;
      clearTimeout(timeout);
      setDisplay({ status: "ready", bounds: event.data.bounds });
    };
    window.addEventListener("message", onMessage);
    setDisplay(current => ({ ...current, status: "loading" }));
    frame.current?.contentWindow?.postMessage({
      type: "movcues:theme-preview", canvas: true, studio: true, renderId, sample, targetLabel: "Example control",
    }, "*");
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
    };
  }, [loaded, sample, width]);

  const bounds = display.bounds ?? { x: 0, y: 0, width, height: frameHeight };
  const space = observedWidth || width;
  const scale = focused ? Math.min(1, space / width) : Math.min(1, (space - 14) / bounds.width, height / bounds.height);
  const offsetX = focused ? (space - width * scale) / 2 : (space - bounds.width * scale) / 2 - bounds.x * scale;
  const offsetY = focused ? 0 : (height - bounds.height * scale) / 2 - bounds.y * scale;
  const name = label ?? themeComponentNames[sample.id];
  return <div ref={viewport} className="relative min-w-0 overflow-hidden bg-[#f1f4f9]" style={{ height: focused ? frameHeight * scale : height }} data-preview-status={display.status}>
    <iframe ref={frame} title={`${name} runtime preview`} sandbox="allow-scripts" srcDoc={frameDocument}
      tabIndex={focused ? 0 : -1} aria-hidden={!focused} onLoad={() => setLoaded(count => count + 1)}
      style={{ width, height: frameHeight, opacity: display.bounds ? 1 : 0,
        transform: `translate(${offsetX}px,${offsetY}px) scale(${Math.max(.01, scale)})` }}
      className={`absolute left-0 top-0 origin-top-left border-0 ${focused ? "" : "pointer-events-none"}`}/>
    {!display.bounds && <p className="absolute inset-x-0 top-1/2 px-3 text-center text-xs text-slate-600"
      role={display.status === "error" ? "alert" : "status"}>
      {display.status === "error" ? "The runtime preview couldn’t load." : "Loading preview…"}
    </p>}
    {display.bounds && display.status === "error" && <p className="absolute inset-x-0 bottom-0 bg-white/90 p-2 text-center text-xs text-slate-700" role="alert">The latest preview couldn’t load.</p>}
  </div>;
}

function usePreviewSamples(orgId: string, siteId: string, tokens: SiteThemeTokens | undefined) {
  const [result, setResult] = useState<{ previews: ThemePreview[]; templates: ExperienceTemplateSummary[] }>();
  const [status, setStatus] = useState<"ready" | "error" | "loading">("loading");
  useEffect(() => {
    if (!tokens || !isValidThemeTokens(tokens)) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      void getThemePreviews(orgId, siteId, tokens, abort.signal).then(data => {
        if (!abort.signal.aborted) { setResult(data); setStatus("ready"); }
      }).catch(() => { if (!abort.signal.aborted) setStatus("error"); });
    }, 160);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [orgId, siteId, tokens]);
  return { result, status };
}

export function ThemePreviewGallery({ orgId, siteId, tokens, focus, setFocus, comparison }: {
  orgId: string; siteId: string; tokens: SiteThemeTokens; focus: ThemeComponent | null;
  setFocus: (value: ThemeComponent | null) => void; comparison?: SiteThemeTokens;
}) {
  const [mobile, setMobile] = useState(false);
  const [localReady, setLocalReady] = useState<boolean | null>(useLocalPreview ? null : true);
  const { result, status } = usePreviewSamples(orgId, siteId, tokens);
  const proposed = usePreviewSamples(orgId, siteId, comparison);
  useEffect(() => {
    if (!useLocalPreview) return;
    const abort = new AbortController();
    void fetch(localPreviewUrl, { method: "HEAD", signal: abort.signal }).then(response => {
      if (!abort.signal.aborted) setLocalReady(response.ok);
    }).catch(() => { if (!abort.signal.aborted) setLocalReady(false); });
    return () => abort.abort();
  }, []);
  const focused = focus ? result?.previews.find(sample => sample.id === focus) : undefined;
  const comparisonSample = comparison && focus ? proposed.result?.previews.find(sample => sample.id === focus) : undefined;

  return <section aria-label="Experience previews" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3.5">
      <div>
        <h2 className="text-base font-semibold">{focus ? themeComponentNames[focus] : "Experience previews"}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{focus ? "Preview in a responsive app workspace." : "Open a component to inspect it at its runtime size."}</p>
      </div>
      {focus && <div className="flex flex-wrap items-center gap-1">
        <Button variant={mobile ? "ghost" : "secondary"} size="sm" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor/>Desktop</Button>
        <Button variant={mobile ? "secondary" : "ghost"} size="sm" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone/>Mobile</Button>
        <Button variant="outline" size="sm" disabled={!!comparison} onClick={() => setFocus(null)}><LayoutGrid/>Overview</Button>
      </div>}
    </div>
    {!isValidThemeTokens(tokens) && <p role="status" className="text-sm text-muted-foreground">Previews show the last valid design.</p>}
    {status === "error" && <p role="alert" className="text-sm text-destructive">Experience previews couldn’t be prepared.</p>}
    {localReady === false && <p role="alert" className="text-sm text-muted-foreground">Build the SDK preview bundle or configure its URL to see runtime previews.</p>}
    {status !== "error" && localReady !== false && (!result || localReady === null) && <p role="status" className="text-sm text-muted-foreground">Preparing runtime previews…</p>}
    {localReady && !focus && <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
      {result?.previews.map(sample => <article key={sample.id} className="overflow-hidden rounded-xl border bg-card">
        <button type="button" onClick={() => setFocus(sample.id)} className="flex w-full items-center justify-between border-b px-3.5 py-2.5 text-left text-sm font-medium hover:bg-muted">
          {themeComponentNames[sample.id]}<ArrowUpRight aria-hidden className="size-4 text-muted-foreground"/>
        </button>
        <PreviewFrame sample={sample}/>
      </article>)}
    </div>}
    {localReady && focused && <div className={comparison ? "grid gap-3 xl:grid-cols-2" : ""}>
      <div className="overflow-hidden rounded-xl border bg-[#f1f4f9]">
        {comparison && <h3 className="border-b bg-card px-4 py-2 text-sm font-medium">Current</h3>}
        <PreviewFrame key={focused.id} sample={focused} focused mobile={mobile}/>
      </div>
      {comparison && <div className="overflow-hidden rounded-xl border bg-[#f1f4f9]">
        <h3 className="border-b bg-card px-4 py-2 text-sm font-medium">Proposed by Geo</h3>
        {comparisonSample ? <PreviewFrame key={comparisonSample.id} sample={comparisonSample} focused mobile={mobile} label={`Proposed ${themeComponentNames[comparisonSample.id]}`}/>
          : <p className="p-4 text-sm text-muted-foreground" role="status">{proposed.status === "error" ? "Proposal preview couldn’t be prepared." : "Preparing proposal preview…"}</p>}
      </div>}
    </div>}
    {!!result?.templates.length && !focus && <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Built-in experience templates</summary>
      <ul className="grid gap-3 border-t p-4 sm:grid-cols-2">{result.templates.map(template => <li key={template.id}>
        <span className="text-sm font-medium">{template.name}</span>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </li>)}</ul>
    </details>}
  </section>;
}

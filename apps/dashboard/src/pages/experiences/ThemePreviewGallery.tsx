import { useEffect, useRef, useState } from "react";
import { getThemePreviews } from "../../api/themes";
import { themeComponentNames, isValidThemeTokens } from "../../components/settings/ThemesSettings";
import type { SiteThemeTokens, ThemePreview } from "../../types/themes";
import type { ExperienceTemplateSummary } from "../../api/experiences";

const previewScript = (() => {
  const url = new URL(import.meta.env.VITE_THEME_PREVIEW_URL || "https://cdn.movcues.com/sdk-theme-preview.min.js");
  if (url.protocol !== "https:" && !(import.meta.env.DEV && url.protocol === "http:")) throw new Error("Invalid theme preview URL");
  return url.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
})();

const frameDocument = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body { margin:0; width:100%; height:100%; overflow:hidden; }
body { font:13px system-ui,sans-serif; background:#f5f7fb; color:#344563; }
#theme-preview-target { position:absolute; top:24%; left:50%; transform:translateX(-50%); padding:8px 12px; border:1px solid #c6d2e5; border-radius:8px; background:white; color:inherit; font:inherit; }
</style></head><body><script src="${previewScript}"></script></body></html>`;

function PreviewFrame({ sample }: { sample: ThemePreview }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  function send() {
    iframe.current?.contentWindow?.postMessage({ type: "movcues:theme-preview", sample }, "*");
  }
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source === iframe.current?.contentWindow && event.data?.type === "movcues:theme-preview-rendered") {
        setReady(true);
        setUnavailable(false);
      }
    }
    window.addEventListener("message", onMessage);
    const timeout = window.setTimeout(() => setUnavailable(true), 12_000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
    };
  }, []);
  useEffect(() => {
    iframe.current?.contentWindow?.postMessage({ type: "movcues:theme-preview", sample }, "*");
  }, [sample]);
  const name = themeComponentNames[sample.id];
  return <article className={`relative min-w-0 overflow-hidden rounded-xl border bg-card ${sample.id === "modal" || sample.id === "survey" ? "xl:col-span-2" : ""}`}>
    <h3 className="border-b px-4 py-2.5 text-sm font-medium">{name}</h3>
    <iframe ref={iframe} title={`${name} runtime preview`} sandbox="allow-scripts" srcDoc={frameDocument} onLoad={send}
      className={`block w-full border-0 ${sample.id === "survey" ? "h-[420px]" : sample.id === "checklist" ? "h-[380px]" : "h-[270px]"}`}/>
    {!ready && <p className="absolute inset-x-0 top-16 px-4 text-center text-xs text-muted-foreground" role="status">
      {unavailable ? "The runtime preview couldn’t load." : "Loading runtime preview…"}
    </p>}
  </article>;
}

export function ThemePreviewGallery({ orgId, siteId, tokens, imported = false }: {
  orgId: string; siteId: string; tokens: SiteThemeTokens; imported?: boolean;
}) {
  const [previews, setPreviews] = useState<ThemePreview[]>([]);
  const [templates, setTemplates] = useState<ExperienceTemplateSummary[]>([]);
  const [error, setError] = useState(false);
  const valid = isValidThemeTokens(tokens);
  useEffect(() => {
    if (!valid) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void getThemePreviews(orgId, siteId, tokens).then(result => {
        if (!current) return;
        setPreviews(result.previews);
        setTemplates(result.templates);
        setError(false);
      }).catch(() => { if (current) setError(true); });
    }, 220);
    return () => { current = false; window.clearTimeout(timer); };
  }, [orgId, siteId, tokens, valid]);
  const visible = imported ? previews.filter(sample => sample.id === "modal") : previews;
  return <section aria-label={imported ? "Imported theme preview" : "Experience previews"} className="min-w-0 space-y-3">
    {!imported && <h2 className="text-lg font-semibold tracking-tight">Experience previews</h2>}
    {!valid && <p role="status" className="text-sm text-muted-foreground">Previews show the latest valid values.</p>}
    {error && <p role="alert" className="text-sm text-destructive">Experience previews couldn’t be prepared.</p>}
    {valid && !error && !previews.length && <p role="status" className="text-sm text-muted-foreground">Preparing runtime previews…</p>}
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {visible.map(sample => <PreviewFrame key={sample.id} sample={sample}/>)}
    </div>
    {!imported && templates.length > 0 && <section aria-label="Built-in templates" className="rounded-xl border bg-card">
      <details>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Built-in experience templates</summary>
        <ul className="grid gap-3 border-t p-4 sm:grid-cols-2">{templates.map(template => <li key={template.id}>
          <span className="text-sm font-medium">{template.name}</span>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </li>)}</ul>
      </details>
    </section>}
  </section>;
}

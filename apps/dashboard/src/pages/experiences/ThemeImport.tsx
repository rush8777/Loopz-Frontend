import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@movcues/ui";
import { ExternalLink, Globe2, X } from "lucide-react";
import { createThemeCapture, generateImportedDesign, getImportedDesign, getThemeCapture } from "../../api/themes";
import { GeoAvatar } from "../ai/GeoAvatar";
import type { ImportedDesign, ThemeImportResult } from "../../types/themes";

const fallbackMessage: Record<Extract<ThemeImportResult, { status: "failed" }>["reason"], string> = {
  unavailable: "Geo is unavailable for this workspace.",
  daily_limit: "This workspace has reached its daily Geo limit.",
  timeout: "Geo took too long to respond.",
  provider_error: "Geo couldn’t finish this import.",
  invalid_design: "Geo returned a design that couldn’t be validated.",
};

function pause(signal: AbortSignal, delay: number) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => { window.clearTimeout(timer); reject(signal.reason); };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, delay);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

function safeSiteUrl(domain: string | null) {
  if (!domain) return null;
  try {
    const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function captureUrl(base: string, id: string) {
  const url = new URL(base);
  url.searchParams.set("movcues_theme_capture", id);
  return url.href;
}

type Result = { captureId: string; design: Extract<ThemeImportResult, { status: "ready" | "failed" }> };
export function ThemeImport({ orgId, siteId, domain, resumableId, hasDraft, openSites, onReview }: {
  orgId: string; siteId: string; domain: string | null; resumableId?: string; hasDraft: boolean;
  openSites: () => void; onReview: (captureId: string, imported: ImportedDesign, replaceDraft: boolean, fallback: boolean) => boolean;
}) {
  const [stage, setStage] = useState<"connecting" | "capture" | "analysis" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState(resumableId);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const url = safeSiteUrl(domain);
  const captureLink = url && lastCapture ? captureUrl(url, lastCapture) : null;
  const reviewCurrent = useRef(onReview);
  useEffect(() => { reviewCurrent.current = onReview; }, [onReview]);

  useEffect(() => () => active.current?.abort(), []);

  function review(captureId: string, imported: ImportedDesign, replaceDraft: boolean, fallback = false) {
    if (reviewCurrent.current(captureId, imported, replaceDraft, fallback)) setReviewed(captureId);
  }

  function start(existing?: string, retry = false) {
    if (active.current || (!existing && !url)) return;
    const controller = new AbortController();
    const { signal } = controller;
    active.current = controller;
    setError(null);
    setResult(null);
    let tab: Window | null = null;
    if (!existing) {
      tab = window.open("", "_blank");
      if (tab) tab.opener = null;
    }
    void (async () => {
      try {
        let captureId = existing;
        if (!captureId) {
          setStage("connecting");
          const { capture } = await createThemeCapture(orgId, siteId, signal);
          signal.throwIfAborted();
          captureId = capture.id;
          setLastCapture(captureId);
          if (tab && !tab.closed && url) tab.location.replace(captureUrl(url, captureId));
        }
        setStage("capture");
        while (true) {
          const { capture: status } = await getThemeCapture(orgId, siteId, captureId, signal);
          if (status.status === "received") break;
          if (status.status === "expired") throw new Error("This capture expired. Start another import.");
          if (status.status === "origin_mismatch") throw new Error("The SDK reported a different origin. Open the configured primary domain and import again.");
          await pause(signal, 1200);
        }
        setStage("analysis");
        let design = await generateImportedDesign(orgId, siteId, captureId, retry, signal);
        for (let attempt = 0; (design.status === "working" || design.status === "awaiting_generation") && attempt < 38; attempt++) {
          await pause(signal, 1600);
          design = await getImportedDesign(orgId, siteId, captureId, signal);
          if (design.status === "awaiting_generation") design = await generateImportedDesign(orgId, siteId, captureId, false, signal);
        }
        signal.throwIfAborted();
        if (design.status !== "ready" && design.status !== "failed") throw new Error("Geo is still working. Resume this capture to check again.");
        setResult({ captureId, design });
        if (design.status === "ready") review(captureId, design.proposal, false);
      } catch (caught) {
        if (tab && !tab.closed) {
          try { if (tab.location.href === "about:blank") tab.close(); } catch { /* The capture tab reached the configured site. */ }
        }
        if (!signal.aborted) setError(caught instanceof Error && !("status" in caught) ? caught.message : "The import couldn’t finish. You can resume a completed capture.");
      } finally {
        if (active.current === controller) { active.current = null; setStage(null); }
      }
    })();
  }

  const resumable = lastCapture ?? resumableId;
  const ready = result?.design.status === "ready" ? result.design.proposal : undefined;
  const failed = result?.design.status === "failed" ? result.design : undefined;
  return <section aria-label="Import from website" className="space-y-3 border-t px-4 py-4">
    <div className="flex items-center gap-2 font-medium"><Globe2 aria-hidden className="size-4 text-primary"/>Import from website</div>
    {stage ? <div className="space-y-2 rounded-lg border bg-muted/35 px-3 py-2.5 text-sm" role="status">
      <div className="flex items-center gap-2">
        {stage === "analysis" ? <GeoAvatar state="thinking"/> : <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden/>}
        <span className="font-medium">{{ connecting: "Requesting a website capture", capture: "Waiting for website styles", analysis: "Geo is designing your theme" }[stage]}</span>
      </div>
      {stage === "capture" && captureLink && <p className="text-xs text-muted-foreground">Open the page with the Movcues SDK installed. If you had to sign in, open the capture link again. <a href={captureLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">Open site<ExternalLink className="size-3"/></a></p>}
      <Button size="sm" variant="ghost" onClick={() => { active.current?.abort(); active.current = null; setStage(null); setError(null); }}><X/>Cancel import</Button>
    </div> : <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => url ? start() : openSites()}>{url ? "Import website styles" : "Set primary domain"}</Button>
      {resumable && !result && reviewed !== resumable && <Button size="sm" variant="ghost" onClick={() => { setLastCapture(resumable); start(resumable); }}>Resume import</Button>}
    </div>}
    {error && <Alert role="alert" className="text-sm">{error}</Alert>}
    {ready && result && reviewed !== result.captureId && <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
      <p>{ready.explanation}</p>
      <Button size="sm" onClick={() => void review(result.captureId, ready, true)}>{hasDraft ? "Replace draft with imported design" : "Review imported design"}</Button>
    </div>}
    {failed && result && reviewed !== result.captureId && !stage && <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
      <p>{fallbackMessage[failed.reason]} You can review a theme made from the captured styles.</p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={() => void review(result.captureId, { tokens: failed.fallback, explanation: "This design uses the captured styling and Movcues’ component defaults.", assumptions: [] }, true, true)}>{hasDraft ? "Replace draft with fallback" : "Review fallback"}</Button>
        <Button size="sm" variant="ghost" onClick={() => start(result.captureId, true)}>Retry Geo</Button>
      </div>
    </div>}
  </section>;
}

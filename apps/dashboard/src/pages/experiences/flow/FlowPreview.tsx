import { useEffect, useRef, useState } from "react";
import { previewScript } from "../themePreviewScript";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { isGuideDefinition, isWidgetDefinition } from "../../../types/experiences";
import type { FlowStep } from "./flowGraph";

const frameWidth = 1040;
const frameHeight = 720;
const previewWidth = 280;
const previewHeight = 200;
const frameDocument = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body { margin:0; width:100%; height:100%; overflow:hidden; }
body { color:#344563; font:13px system-ui,sans-serif; }
#theme-preview-target { position:absolute; z-index:1; top:52%; left:46%; transform:translate(-50%,-50%); padding:8px 12px; border:1px solid #c6d2e5; border-radius:8px; background:white; color:inherit; font:inherit; max-width:36%; }
</style></head><body><script src="${previewScript}"></script></body></html>`;

type Bounds = { x: number; y: number; width: number; height: number };

function validBounds(bounds: Bounds | undefined): bounds is Bounds {
  return !!bounds && [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
    bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0 &&
    bounds.width + bounds.x <= frameWidth && bounds.height + bounds.y <= frameHeight;
}

export function previewPayload(experience: Experience, definition: ExperienceDefinition, node: FlowStep) {
  // Other steps only provide order and branch destinations. Keep their HTML out
  // of this frame so an edit to another card does not remount the selected preview.
  let preview = definition;
  if (isGuideDefinition(definition)) {
    preview = { ...definition, steps: definition.steps.map(step => step.id === node.stepId ? step : {
      id: step.id, content: { heading: "", body: "" }, behavior: step.behavior,
    }) };
  } else if (isWidgetDefinition(definition) && definition.survey) {
    const survey = definition.survey;
    preview = { ...definition, survey: { ...survey, steps: survey.steps.map(step => step.id === node.stepId ? step : {
      id: step.id, content: { heading: "", body: "" }, questions: [],
    }) } };
  }
  return {
    sample: { id: experience.id, versionId: "flow-preview", kind: experience.kind, widgetType: experience.widgetType,
      definition: preview, priority: 0, stepId: node.stepId },
    targetLabel: node.target?.label,
  };
}

export function FlowPreview({ payload, label }: { payload: string; label: string }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const generation = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [bounds, setBounds] = useState<Bounds>({ x: 0, y: 0, width: frameWidth, height: frameHeight });
  useEffect(() => {
    if (!loaded) return;
    const renderId = ++generation.current;
    const timeout = window.setTimeout(() => setUnavailable(true), 6000);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || event.data?.type !== "movcues:theme-preview-rendered") return;
      if (event.data.renderId !== undefined && event.data.renderId !== renderId) return;
      if (validBounds(event.data.bounds)) setBounds(event.data.bounds);
      clearTimeout(timeout);
      setReady(true);
      setUnavailable(false);
    };
    window.addEventListener("message", onMessage);
    iframe.current?.contentWindow?.postMessage({
      type: "movcues:theme-preview", canvas: true, renderId, ...JSON.parse(payload),
    }, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, [loaded, payload]);
  const zoom = Math.min(0.96, previewWidth / bounds.width, previewHeight / bounds.height);
  return (
    <div className="flow-preview" inert data-rendered={ready}>
      <iframe
        aria-hidden="true" tabIndex={-1} ref={iframe} title={`${label} preview`}
        sandbox="allow-scripts" srcDoc={frameDocument} onLoad={() => setLoaded(true)}
        style={{
          width: frameWidth, height: frameHeight, opacity: ready ? 1 : 0,
          transform: `translate(${(previewWidth - bounds.width * zoom) / 2 - bounds.x * zoom}px, ${(previewHeight - bounds.height * zoom) / 2 - bounds.y * zoom}px) scale(${zoom})`,
        }}
      />
      {(!ready || unavailable) && <span className="flow-preview-status">
        {unavailable ? "Preview unavailable" : "Loading preview…"}
      </span>}
    </div>
  );
}

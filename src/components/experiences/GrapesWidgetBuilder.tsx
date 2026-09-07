import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Component, Editor } from "grapesjs";
import { Code2, Monitor, Redo2, Smartphone, Tablet, Undo2, X } from "lucide-react";
import "grapesjs/dist/css/grapes.min.css";
import "./GrapesWidgetBuilder.css";
import type { ExperienceAction, ExperienceContent, ExperienceDesign, ExperienceSize, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { builderSignature, createWidgetStarter, isSafeBuilderProjectData, projectLegacyContent, sanitizeBuilderHtml, validateBuilderCss, type BuilderExport } from "./widgetBuilder";
import { installWidgetInteractions } from "./grapesWidgetInteractions";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS, widgetSizeCss } from "./widgetSizing";

interface Props {
  experienceKey: string;
  widgetType: WidgetType;
  value?: WidgetBuilderState;
  content: ExperienceContent;
  design: ExperienceDesign;
  onChange: (value: BuilderExport) => void;
  onPrimaryActionChange: (action: ExperienceAction | undefined) => void;
  onSizeChange: (size: ExperienceSize) => void;
}

export interface GrapesWidgetBuilderHandle { flush: () => void }

const AUTHORING_CANVAS_WIDTH = 1200;
const AUTHORING_CANVAS_HEIGHT = 900;

export const GrapesWidgetBuilder = forwardRef<GrapesWidgetBuilderHandle, Props>(function GrapesWidgetBuilder({ experienceKey, widgetType, value, content, design, onChange, onPrimaryActionChange, onSizeChange }, ref) {
  const canvasRef = useRef<HTMLDivElement>(null); const blocksRef = useRef<HTMLDivElement>(null); const stylesRef = useRef<HTMLDivElement>(null); const traitsRef = useRef<HTMLDivElement>(null); const editorRef = useRef<Editor | null>(null);
  const applyingCodeRef = useRef(false);
  const flushExportRef = useRef<() => void>(() => void 0);
  const fitCanvasRef = useRef<() => void>(() => void 0);
  const scheduleCanvasFitRef = useRef<() => void>(() => void 0);
  const applySizeEnvelopeRef = useRef<(next: ExperienceDesign) => void>(() => void 0);
  const onChangeRef = useRef(onChange); const onSizeChangeRef = useRef(onSizeChange); const contentRef = useRef(content); const designRef = useRef(design); const lastSignature = useRef(value ? builderSignature(value) : "");
  const [ready, setReady] = useState(false); const [positioned, setPositioned] = useState(false); const [device, setDevice] = useState("Desktop"); const [codeMode, setCodeMode] = useState(false); const [codeHtml, setCodeHtml] = useState(value?.html ?? ""); const [codeCss, setCodeCss] = useState(value?.css ?? ""); const [codeError, setCodeError] = useState<string | null>(null); const [selectedAction, setSelectedAction] = useState<"primary" | "secondary" | null>(null); const [sidebarTab, setSidebarTab] = useState<"blocks" | "properties">("blocks");
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]); useEffect(() => { onSizeChangeRef.current = onSizeChange; }, [onSizeChange]); useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { designRef.current = design; applySizeEnvelopeRef.current(design); scheduleCanvasFitRef.current(); }, [design]);
  useImperativeHandle(ref, () => ({ flush: () => flushExportRef.current() }), []);

  useEffect(() => {
    let cancelled = false; let timer = 0; let fitFrame = 0; let editor: Editor | null = null; let initialized = false; let resizeObserver: ResizeObserver | null = null;
    setPositioned(false);
    lastSignature.current = value ? builderSignature(value) : "";
    const starter = createWidgetStarter(widgetType, contentRef.current, design);
    const storedProjectData = value && isSafeBuilderProjectData(value.projectData) && hasUsableProjectData(value.projectData) ? value.projectData : undefined;
    const editorCss = () => validateBuilderCss(editor?.getCss({ avoidProtected: true }) ?? "");
    const emit = () => {
      if (!editor || cancelled) return;
      try {
        const html = sanitizeBuilderHtml(editor.getHtml()); const css = editorCss();
        const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html, css }; const signature = builderSignature(builder);
        if (signature === lastSignature.current) return;
        lastSignature.current = signature; editor.clearDirtyCount(); setCodeHtml(html); setCodeCss(css); setCodeError(null);
        onChangeRef.current({ builder, content: projectLegacyContent(html, contentRef.current) });
      } catch (error) { setCodeError(error instanceof Error ? error.message : "Builder content could not be exported."); }
    };
    const scheduleCanvasFit = () => {
      window.cancelAnimationFrame(fitFrame);
      fitFrame = window.requestAnimationFrame(() => {
        if (!editor || cancelled) return;
        editor.refresh();
        fitFrame = window.requestAnimationFrame(() => fitCanvasRef.current());
      });
    };
    scheduleCanvasFitRef.current = scheduleCanvasFit;
    const schedule = () => {
      if (!editor || applyingCodeRef.current) return;
      scheduleCanvasFit();
      if (editor.getDirtyCount() === 0) return;
      clearTimeout(timer);
      timer = window.setTimeout(emit, 400);
    };
    flushExportRef.current = () => { clearTimeout(timer); emit(); };
    const finishInitialization = () => {
      if (!editor || cancelled) return;
      if (initialized) { scheduleCanvasFit(); return; }
      initialized = true; setReady(true);
      if (!value && editor.getWrapper()?.components().length === 0) {
        applyingCodeRef.current = true;
        editor.setComponents(starter.html);
        editor.setStyle(starter.css);
        applyingCodeRef.current = false;
      }
      const html = sanitizeBuilderHtml(editor.getHtml()); const css = editorCss(); setCodeHtml(html); setCodeCss(css);
      if (!value) { lastSignature.current = ""; emit(); } else editor.clearDirtyCount();
      scheduleCanvasFit();
    };
    void import("grapesjs").then(module => {
      if (cancelled || !canvasRef.current || !blocksRef.current || !stylesRef.current || !traitsRef.current) return;
      const grapesjs = module.default;
      const envelopeCss = builderSizeEnvelopeCss(widgetType, designRef.current);
      editor = grapesjs.init({
        container: canvasRef.current, height: "100%", width: "auto", storageManager: false, panels: { defaults: [] }, parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } }, canvasCss: `html{width:100%;height:100%;overflow:hidden;background:#f8fafc}body{box-sizing:border-box;min-height:100%;margin:0;padding:48px 32px 32px;display:flex;justify-content:center;align-items:flex-start;background:#f8fafc}*{box-sizing:border-box}${envelopeCss}`,
        ...(storedProjectData ? { projectData: storedProjectData } : value ? { components: sanitizeBuilderHtml(value.html), style: validateBuilderCss(value.css) } : { components: starter.html, style: starter.css }),
        deviceManager: { devices: [{ id: "desktop", name: "Desktop", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px` }, { id: "tablet", name: "Tablet", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "768px" }, { id: "mobile", name: "Mobile", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "390px" }] },
        blockManager: { appendTo: blocksRef.current, blocks: blocks() },
        traitManager: { appendTo: traitsRef.current },
        styleManager: { appendTo: stylesRef.current, sectors: styleSectors() },
        plugins: [instance => instance.DomComponents.addType("loopz-button", { isComponent: element => element.tagName === "BUTTON" && element.hasAttribute("data-loopz-action-id") ? { type: "loopz-button" } : false, model: { defaults: { tagName: "button", droppable: false, editable: true, traits: [] } } }), instance => installWidgetInteractions(instance, { widgetType, design: () => designRef.current, onRootResize: (size, commit) => { const next = { ...designRef.current, size }; applySizeEnvelopeRef.current(next); if (commit) { designRef.current = next; onSizeChangeRef.current(size); scheduleCanvasFitRef.current(); } } })],
      });
      if (cancelled) { editor.destroy(); return; }
      editorRef.current = editor;
      applySizeEnvelopeRef.current = next => {
        if (!editor || cancelled) return;
        const documentValue = editor.Canvas.getDocument();
        if (!documentValue) return;
        let style = documentValue.head.querySelector<HTMLStyleElement>("style[data-loopz-size-envelope]");
        if (!style) { style = documentValue.createElement("style"); style.dataset.loopzSizeEnvelope = ""; documentValue.head.appendChild(style); }
        style.textContent = builderSizeEnvelopeCss(widgetType, next);
      };
      fitCanvasRef.current = () => {
        if (!editor || cancelled || !canvasRef.current) return;
        const widget = editor.getWrapper()?.find(".loopz-widget")[0]?.getEl();
        if (!widget) return;
        const availableWidth = canvasRef.current.clientWidth - 80;
        const availableHeight = canvasRef.current.clientHeight - 96;
        if (availableWidth <= 0 || availableHeight <= 0) return;
        const widgetWidth = Math.max(1, widget.offsetWidth);
        const widgetHeight = Math.max(1, widget.offsetHeight);
        const zoom = Math.min(1, Math.max(0.1, availableWidth / widgetWidth), Math.max(0.1, availableHeight / widgetHeight));
        editor.Canvas.setZoom(zoom * 100);
        editor.Canvas.setCoords((canvasRef.current.clientWidth - AUTHORING_CANVAS_WIDTH * zoom) / 2, 0);
        setPositioned(true);
      };
      if (typeof ResizeObserver !== "undefined" && canvasRef.current) {
        resizeObserver = new ResizeObserver(scheduleCanvasFit);
        resizeObserver.observe(canvasRef.current);
      }
      applySizeEnvelopeRef.current(designRef.current);
      if (!value) { applyingCodeRef.current = true; editor.setComponents(starter.html); editor.setStyle(starter.css); editor.clearDirtyCount(); applyingCodeRef.current = false; }
      const selectAction = (component?: Component) => { const slot = component?.getAttributes()?.["data-loopz-action-id"]; setSelectedAction(slot === "primary" || slot === "secondary" ? slot : null); setSidebarTab("properties"); };
      const keepOneActionPerSlot = (component: Component) => { const slot = component.getAttributes()?.["data-loopz-action-id"]; if (slot !== "primary" && slot !== "secondary") return; const matches = editor!.getWrapper()!.find(`[data-loopz-action-id="${slot}"]`); if (matches.length > 1) { component.remove(); editor!.select(matches[0]); } };
      editor.on("update", schedule); editor.on("component:selected", selectAction); editor.on("component:add", keepOneActionPerSlot); editor.on("load", finishInitialization); editor.onReady(finishInitialization);
    }).catch(() => setCodeError("GrapesJS could not be loaded."));
    return () => { cancelled = true; clearTimeout(timer); window.cancelAnimationFrame(fitFrame); resizeObserver?.disconnect(); flushExportRef.current = () => void 0; fitCanvasRef.current = () => void 0; scheduleCanvasFitRef.current = () => void 0; applySizeEnvelopeRef.current = () => void 0; editorRef.current = null; editor?.destroy(); };
  // A different draft gets a separate editor instance; parent state updates do not reinitialize GrapesJS.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceKey]);

  useEffect(() => {
    if (codeMode) return;
    const timer = window.setTimeout(() => {
      scheduleCanvasFitRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [codeMode]);

  const chooseDevice = (name: string) => { editorRef.current?.setDevice(name); setDevice(name); scheduleCanvasFitRef.current(); };
  const previewSize = (size: ExperienceSize) => {
    applySizeEnvelopeRef.current({ ...designRef.current, size });
    scheduleCanvasFitRef.current();
  };
  const toggleCode = () => { if (!codeMode && editorRef.current) { setCodeHtml(sanitizeBuilderHtml(editorRef.current.getHtml())); setCodeCss(validateBuilderCss(editorRef.current.getCss({ avoidProtected: true }) ?? "")); } else if (codeMode) setPositioned(false); setCodeError(null); setCodeMode(value => !value); };
  const applyCode = () => { const editor = editorRef.current; if (!editor) return; try { const html = sanitizeBuilderHtml(codeHtml); const css = validateBuilderCss(codeCss); applyingCodeRef.current = true; editor.setComponents(html); editor.setStyle(css); editor.clearDirtyCount(); const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html: sanitizeBuilderHtml(editor.getHtml()), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? "") }; lastSignature.current = builderSignature(builder); setCodeHtml(builder.html); setCodeCss(builder.css); setCodeError(null); onChangeRef.current({ builder, content: projectLegacyContent(builder.html, contentRef.current) }); scheduleCanvasFitRef.current(); } catch (error) { setCodeError(error instanceof Error ? error.message : "The code could not be applied."); } finally { applyingCodeRef.current = false; } };
  const currentAction = content.primaryAction;
  const updateActionType = (type: ExperienceAction["type"]) => { const label = currentAction?.label ?? "Continue"; onPrimaryActionChange(type === "open_url" ? { label, type, url: currentAction?.url ?? "https://example.com" } : type === "track_event" ? { label, type, eventName: currentAction?.eventName ?? "experience_action" } : { label, type: "dismiss" }); };

  return <div className="loopz-builder-shell">
    <div className="loopz-builder-toolbar"><div className="loopz-builder-toolbar__group">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <Button key={String(name)} type="button" size="sm" variant={device === name ? "default" : "outline"} onClick={() => chooseDevice(String(name))}><Icon className="size-4" />{String(name)}</Button>)}</div><div className="loopz-builder-toolbar__group"><Button type="button" size="icon" variant="outline" aria-label="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Clear selection" onClick={() => editorRef.current?.select()}><X /></Button><Button type="button" size="icon" variant={codeMode ? "default" : "outline"} aria-label="Toggle HTML and CSS editor" onClick={toggleCode}><Code2 /></Button></div></div>
    <div className={`loopz-builder-code${codeMode ? "" : " loopz-builder-view--hidden"}`} aria-hidden={!codeMode}><Label>HTML<Textarea aria-label="Builder HTML" value={codeHtml} onChange={event => setCodeHtml(event.target.value)} /></Label><Label>CSS<Textarea aria-label="Builder CSS" value={codeCss} onChange={event => setCodeCss(event.target.value)} /></Label><div className="col-span-full flex items-center gap-3"><Button type="button" onClick={applyCode}>Apply HTML and CSS</Button>{codeError && <p className="m-0 text-sm text-destructive">{codeError}</p>}</div></div>
    <div className={`loopz-builder-workspace${codeMode ? " loopz-builder-view--hidden" : ""}`} aria-hidden={codeMode}><aside className="loopz-builder-panel"><div className="loopz-builder-tabs" role="tablist" aria-label="Builder sidebar"><button type="button" role="tab" id="loopz-builder-blocks-tab" aria-selected={sidebarTab === "blocks"} aria-controls="loopz-builder-blocks-panel" onClick={() => setSidebarTab("blocks")}>Blocks</button><button type="button" role="tab" id="loopz-builder-properties-tab" aria-selected={sidebarTab === "properties"} aria-controls="loopz-builder-properties-panel" onClick={() => setSidebarTab("properties")}>Properties</button></div><div className={`loopz-builder-tab-panel${sidebarTab === "blocks" ? "" : " loopz-builder-tab-panel--hidden"}`} role="tabpanel" id="loopz-builder-blocks-panel" aria-labelledby="loopz-builder-blocks-tab"><p className="loopz-builder-hint">Drag blocks into the canvas, then select an element to customize it.</p><div ref={blocksRef} /></div><div className={`loopz-builder-tab-panel${sidebarTab === "properties" ? "" : " loopz-builder-tab-panel--hidden"}`} role="tabpanel" id="loopz-builder-properties-panel" aria-labelledby="loopz-builder-properties-tab"><WidgetSizeEditor widgetType={widgetType} design={design} onPreview={previewSize} onChange={onSizeChange} /><div ref={traitsRef} /><div ref={stylesRef} />{selectedAction === "primary" && <div className="loopz-action-inspector"><h3>Loopz action</h3><Label>Action<select value={currentAction?.type ?? "dismiss"} onChange={event => updateActionType(event.target.value as ExperienceAction["type"])}><option value="dismiss">Dismiss</option><option value="open_url">Open URL</option><option value="track_event">Track event</option></select></Label>{currentAction?.type === "open_url" && <Label>URL<Input type="url" value={currentAction.url ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, url: event.target.value })} /></Label>}{currentAction?.type === "track_event" && <Label>Event name<Input value={currentAction.eventName ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, eventName: event.target.value })} /></Label>}</div>}{selectedAction === "secondary" && <div className="loopz-action-inspector"><h3>Loopz action</h3><p>Secondary buttons use the existing dismiss action.</p></div>}</div></aside><div className="loopz-builder-canvas"><div ref={canvasRef} className="loopz-builder-editor" />{(!ready || !positioned) && <div className="loopz-builder-loading">Loading builder…</div>}</div></div>
  </div>;
});

function blocks() { return [
  { id: "container", label: "Container", category: "Layout", content: { type: "default", tagName: "div", classes: ["loopz-widget__container"], components: "Container" } },
  { id: "row", label: "Row", category: "Layout", content: '<div class="loopz-widget__row"><div class="loopz-widget__column">Column</div><div class="loopz-widget__column">Column</div></div>' },
  { id: "columns", label: "Columns", category: "Layout", content: '<div class="loopz-widget__columns"><div class="loopz-widget__column">Left</div><div class="loopz-widget__column">Right</div></div>' },
  { id: "heading", label: "Heading", category: "Content", content: '<h2 class="loopz-widget__heading">Heading</h2>' },
  { id: "text", label: "Text", category: "Content", content: '<p class="loopz-widget__body">Add your message.</p>' },
  { id: "image", label: "Image", category: "Content", content: { type: "image", tagName: "img", attributes: { class: "loopz-widget__image", alt: "" } }, activate: true },
  { id: "icon", label: "Icon", category: "Content", content: '<span class="loopz-widget__icon" role="img" aria-label="Icon">★</span>' },
  { id: "divider", label: "Divider", category: "Content", content: '<hr class="loopz-widget__divider">' },
  { id: "spacer", label: "Spacer", category: "Layout", content: '<div class="loopz-widget__spacer">&nbsp;</div>' },
  { id: "button", label: "Button", category: "Actions", content: '<button class="loopz-widget__button" data-loopz-action-id="primary">Continue</button>' },
  { id: "secondary-button", label: "Secondary button", category: "Actions", content: '<button class="loopz-widget__button loopz-widget__button--secondary" data-loopz-action-id="secondary">Dismiss</button>' },
]; }

function styleSectors() { return [
  { id: "layout", name: "Layout", open: true, properties: ["display", "flex-direction", "justify-content", "align-items", "gap", "width", "height", "min-width", "max-width", "min-height", "max-height", "padding", "margin"] },
  { id: "positioning", name: "Positioning", open: false, properties: ["position", "top", "right", "bottom", "left", "z-index"] },
  { id: "typography", name: "Typography", open: true, properties: ["font-family", "font-size", "font-weight", "line-height", "text-align", "color"] },
  { id: "appearance", name: "Appearance", open: true, properties: ["background-color", "border", "border-radius", "box-shadow", "opacity"] },
]; }

function WidgetSizeEditor({ widgetType, design, onPreview, onChange }: { widgetType: WidgetType; design: ExperienceDesign; onPreview: (size: ExperienceSize) => void; onChange: (size: ExperienceSize) => void }) {
  const constraint = WIDGET_SIZE_CONSTRAINTS[widgetType]; const size = normalizeWidgetSize(widgetType, design);
  const [width, setWidth] = useState(String(size.width.value ?? "")); const [height, setHeight] = useState(String(size.height.value ?? "")); const [notice, setNotice] = useState("");
  useEffect(() => { setWidth(String(size.width.value ?? "")); setHeight(String(size.height.value ?? "")); }, [size.width.mode, size.width.value, size.height.mode, size.height.value]);
  const persist = (next: ExperienceSize) => { onPreview(next); onChange(next); };
  const previewWidth = (value: string) => { const numeric = Number(value); if (value.trim() && Number.isFinite(numeric)) onPreview({ ...size, width: { mode: "fixed", value: clampWidgetWidth(widgetType, numeric).value } }); };
  const previewHeight = (value: string) => { const numeric = Number(value); if (value.trim() && Number.isFinite(numeric)) onPreview({ ...size, height: { mode: "fixed", value: clampWidgetHeight(widgetType, numeric).value } }); };
  const commitWidth = () => { const result = clampWidgetWidth(widgetType, Number(width)); const next = { ...size, width: { mode: "fixed" as const, value: result.value } }; setWidth(String(result.value)); setNotice(result.boundary === "min" ? `Minimum width for ${widgetLabel(widgetType)} is ${constraint.width.min}px.` : result.boundary === "max" ? `Maximum width for ${widgetLabel(widgetType)} is ${constraint.width.max}px.` : ""); persist(next); };
  const commitHeight = () => { const result = clampWidgetHeight(widgetType, Number(height)); const next = { ...size, height: { mode: "fixed" as const, value: result.value } }; setHeight(String(result.value)); setNotice(result.boundary === "min" ? `Minimum height is ${constraint.height.min}px.` : result.boundary === "max" ? `Maximum height is ${constraint.height.max}px.` : ""); persist(next); };
  return <div className="loopz-builder-size"><h3>Size</h3>{widgetType === "banner" ? <><Label>Width<Input value="Full width" disabled /></Label><p>Banner width is locked to its container.</p></> : <><Label>Width mode<select value={size.width.mode} onChange={event => { const mode = event.target.value as "fixed" | "full"; const next = mode === "full" ? { width: { mode: "full" as const }, height: { mode: "viewport" as const } } : { ...size, width: { mode: "fixed" as const, value: typeof constraint.width.default === "number" ? constraint.width.default : constraint.width.min } }; setNotice(""); persist(next); }}><option value="fixed">Fixed</option>{constraint.width.allowFull && <option value="full">Fullscreen</option>}</select></Label>{size.width.mode === "fixed" && <Label>Width<div className="loopz-size-input"><Input aria-label="Widget width" type="number" min={constraint.width.min} max={constraint.width.max} value={width} onChange={event => { setWidth(event.target.value); previewWidth(event.target.value); }} onBlur={commitWidth} /><span>px</span></div></Label>}</>}{constraint.height.allowFixed && <><Label>Height<select value={size.height.mode} onChange={event => { const mode = event.target.value as ExperienceSize["height"]["mode"]; const next = { ...size, height: mode === "fixed" ? { mode, value: constraint.height.min } : { mode } }; setNotice(""); persist(next); }}><option value="auto">Auto</option><option value="fixed">Fixed</option>{constraint.height.allowViewport && <option value="viewport">Viewport safe</option>}</select></Label>{size.height.mode === "fixed" && <Label>Height<div className="loopz-size-input"><Input aria-label="Widget height" type="number" min={constraint.height.min} max={constraint.height.max} value={height} onChange={event => { setHeight(event.target.value); previewHeight(event.target.value); }} onBlur={commitHeight} /><span>px</span></div></Label>}</>}{!constraint.height.allowFixed && widgetType !== "banner" && <Label>Height<Input value="Auto" disabled /></Label>}<p>{notice || (constraint.width.max ? `Allowed width: ${constraint.width.min}–${constraint.width.max}px.` : "")}</p></div>;
}

function builderSizeEnvelopeCss(widgetType: WidgetType, design: ExperienceDesign): string {
  const size = widgetSizeCss(widgetType, design);
  return `body>.loopz-widget{width:${size.width}!important;${size.minWidth ? `min-width:${size.minWidth}!important;` : ""}${size.maxWidth ? `max-width:${size.maxWidth}!important;` : ""}height:${size.height}!important;max-height:${size.maxHeight}!important;overflow:auto!important}`;
}

function widgetLabel(widgetType: WidgetType): string { return widgetType.split("_").map(value => value[0].toUpperCase() + value.slice(1)).join(" "); }

function hasUsableProjectData(projectData: Record<string, unknown>): boolean {
  const pages = projectData.pages;
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return pages.some(page => { const component = page && typeof page === "object" ? (page as { component?: unknown }).component : null; if (!component || typeof component !== "object") return false; const children = (component as { components?: unknown }).components; return Array.isArray(children) ? children.length > 0 : Boolean(children); });
}

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Component, Editor } from "grapesjs";
import { Code2, Monitor, Redo2, Smartphone, Tablet, Undo2, X } from "lucide-react";
import "grapesjs/dist/css/grapes.min.css";
import "./GrapesWidgetBuilder.css";
import type { ExperienceAction, ExperienceContent, ExperienceDesign, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { builderSignature, createWidgetStarter, isSafeBuilderProjectData, projectLegacyContent, sanitizeBuilderHtml, validateBuilderCss, type BuilderExport } from "./widgetBuilder";

interface Props {
  experienceKey: string;
  widgetType: WidgetType;
  value?: WidgetBuilderState;
  content: ExperienceContent;
  design: ExperienceDesign;
  onChange: (value: BuilderExport) => void;
  onPrimaryActionChange: (action: ExperienceAction | undefined) => void;
}

export interface GrapesWidgetBuilderHandle { flush: () => void }

const AUTHORING_CANVAS_WIDTH = 1200;
const AUTHORING_CANVAS_HEIGHT = 900;

export const GrapesWidgetBuilder = forwardRef<GrapesWidgetBuilderHandle, Props>(function GrapesWidgetBuilder({ experienceKey, widgetType, value, content, design, onChange, onPrimaryActionChange }, ref) {
  const canvasRef = useRef<HTMLDivElement>(null); const blocksRef = useRef<HTMLDivElement>(null); const stylesRef = useRef<HTMLDivElement>(null); const traitsRef = useRef<HTMLDivElement>(null); const editorRef = useRef<Editor | null>(null);
  const applyingCodeRef = useRef(false);
  const flushExportRef = useRef<() => void>(() => void 0);
  const fitCanvasRef = useRef<() => void>(() => void 0);
  const scheduleCanvasFitRef = useRef<() => void>(() => void 0);
  const onChangeRef = useRef(onChange); const contentRef = useRef(content); const lastSignature = useRef(value ? builderSignature(value) : "");
  const [ready, setReady] = useState(false); const [positioned, setPositioned] = useState(false); const [device, setDevice] = useState("Desktop"); const [codeMode, setCodeMode] = useState(false); const [codeHtml, setCodeHtml] = useState(value?.html ?? ""); const [codeCss, setCodeCss] = useState(value?.css ?? ""); const [codeError, setCodeError] = useState<string | null>(null); const [selectedAction, setSelectedAction] = useState<"primary" | "secondary" | null>(null);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]); useEffect(() => { contentRef.current = content; }, [content]);
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
    const schedule = () => { if (!editor || applyingCodeRef.current || editor.getDirtyCount() === 0) return; clearTimeout(timer); timer = window.setTimeout(() => { emit(); scheduleCanvasFit(); }, 400); };
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
      editor = grapesjs.init({
        container: canvasRef.current, height: "100%", width: "auto", storageManager: false, panels: { defaults: [] }, parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } }, canvasCss: "html{width:100%;height:100%;overflow:hidden;background:#f8fafc}body{box-sizing:border-box;min-height:100%;margin:0;padding:48px 32px 32px;display:flex;justify-content:center;align-items:flex-start;background:#f8fafc}*{box-sizing:border-box}",
        ...(storedProjectData ? { projectData: storedProjectData } : value ? { components: sanitizeBuilderHtml(value.html), style: validateBuilderCss(value.css) } : { components: starter.html, style: starter.css }),
        deviceManager: { devices: [{ id: "desktop", name: "Desktop", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px` }, { id: "tablet", name: "Tablet", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "768px" }, { id: "mobile", name: "Mobile", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "390px" }] },
        blockManager: { appendTo: blocksRef.current, blocks: blocks() },
        traitManager: { appendTo: traitsRef.current },
        styleManager: { appendTo: stylesRef.current, sectors: styleSectors() },
        plugins: [instance => instance.DomComponents.addType("loopz-button", { isComponent: element => element.tagName === "BUTTON" && element.hasAttribute("data-loopz-action-id") ? { type: "loopz-button" } : false, model: { defaults: { tagName: "button", droppable: false, editable: true, traits: [] } } })],
      });
      if (cancelled) { editor.destroy(); return; }
      editorRef.current = editor;
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
      if (!value) { applyingCodeRef.current = true; editor.setComponents(starter.html); editor.setStyle(starter.css); editor.clearDirtyCount(); applyingCodeRef.current = false; }
      const selectAction = (component?: Component) => { const slot = component?.getAttributes()?.["data-loopz-action-id"]; setSelectedAction(slot === "primary" || slot === "secondary" ? slot : null); };
      const keepOneActionPerSlot = (component: Component) => { const slot = component.getAttributes()?.["data-loopz-action-id"]; if (slot !== "primary" && slot !== "secondary") return; const matches = editor!.getWrapper()!.find(`[data-loopz-action-id="${slot}"]`); if (matches.length > 1) { component.remove(); editor!.select(matches[0]); } };
      editor.on("update", schedule); editor.on("component:selected", selectAction); editor.on("component:add", keepOneActionPerSlot); editor.on("load", finishInitialization); editor.onReady(finishInitialization);
    }).catch(() => setCodeError("GrapesJS could not be loaded."));
    return () => { cancelled = true; clearTimeout(timer); window.cancelAnimationFrame(fitFrame); resizeObserver?.disconnect(); flushExportRef.current = () => void 0; fitCanvasRef.current = () => void 0; scheduleCanvasFitRef.current = () => void 0; editorRef.current = null; editor?.destroy(); };
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
  const toggleCode = () => { if (!codeMode && editorRef.current) { setCodeHtml(sanitizeBuilderHtml(editorRef.current.getHtml())); setCodeCss(validateBuilderCss(editorRef.current.getCss({ avoidProtected: true }) ?? "")); } else if (codeMode) setPositioned(false); setCodeError(null); setCodeMode(value => !value); };
  const applyCode = () => { const editor = editorRef.current; if (!editor) return; try { const html = sanitizeBuilderHtml(codeHtml); const css = validateBuilderCss(codeCss); applyingCodeRef.current = true; editor.setComponents(html); editor.setStyle(css); editor.clearDirtyCount(); const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html: sanitizeBuilderHtml(editor.getHtml()), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? "") }; lastSignature.current = builderSignature(builder); setCodeHtml(builder.html); setCodeCss(builder.css); setCodeError(null); onChangeRef.current({ builder, content: projectLegacyContent(builder.html, contentRef.current) }); scheduleCanvasFitRef.current(); } catch (error) { setCodeError(error instanceof Error ? error.message : "The code could not be applied."); } finally { applyingCodeRef.current = false; } };
  const currentAction = content.primaryAction;
  const updateActionType = (type: ExperienceAction["type"]) => { const label = currentAction?.label ?? "Continue"; onPrimaryActionChange(type === "open_url" ? { label, type, url: currentAction?.url ?? "https://example.com" } : type === "track_event" ? { label, type, eventName: currentAction?.eventName ?? "experience_action" } : { label, type: "dismiss" }); };

  return <div className="loopz-builder-shell">
    <div className="loopz-builder-toolbar"><div className="loopz-builder-toolbar__group">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <Button key={String(name)} type="button" size="sm" variant={device === name ? "default" : "outline"} onClick={() => chooseDevice(String(name))}><Icon className="size-4" />{String(name)}</Button>)}</div><div className="loopz-builder-toolbar__group"><Button type="button" size="icon" variant="outline" aria-label="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Clear selection" onClick={() => editorRef.current?.select()}><X /></Button><Button type="button" size="icon" variant={codeMode ? "default" : "outline"} aria-label="Toggle HTML and CSS editor" onClick={toggleCode}><Code2 /></Button></div></div>
    <div className={`loopz-builder-code${codeMode ? "" : " loopz-builder-view--hidden"}`} aria-hidden={!codeMode}><Label>HTML<Textarea aria-label="Builder HTML" value={codeHtml} onChange={event => setCodeHtml(event.target.value)} /></Label><Label>CSS<Textarea aria-label="Builder CSS" value={codeCss} onChange={event => setCodeCss(event.target.value)} /></Label><div className="col-span-full flex items-center gap-3"><Button type="button" onClick={applyCode}>Apply HTML and CSS</Button>{codeError && <p className="m-0 text-sm text-destructive">{codeError}</p>}</div></div>
    <div className={`loopz-builder-workspace${codeMode ? " loopz-builder-view--hidden" : ""}`} aria-hidden={codeMode}><aside className="loopz-builder-panel"><h3>Blocks</h3><p className="loopz-builder-hint">Drag blocks into the canvas, then select an element to customize it.</p><div ref={blocksRef} /></aside><div className="loopz-builder-canvas"><div ref={canvasRef} className="loopz-builder-editor" />{(!ready || !positioned) && <div className="loopz-builder-loading">Loading builder…</div>}</div><aside className="loopz-builder-panel loopz-builder-panel--right"><h3>Properties</h3><div ref={traitsRef} /><div ref={stylesRef} />{selectedAction === "primary" && <div className="loopz-action-inspector"><h3>Loopz action</h3><Label>Action<select value={currentAction?.type ?? "dismiss"} onChange={event => updateActionType(event.target.value as ExperienceAction["type"])}><option value="dismiss">Dismiss</option><option value="open_url">Open URL</option><option value="track_event">Track event</option></select></Label>{currentAction?.type === "open_url" && <Label>URL<Input type="url" value={currentAction.url ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, url: event.target.value })} /></Label>}{currentAction?.type === "track_event" && <Label>Event name<Input value={currentAction.eventName ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, eventName: event.target.value })} /></Label>}</div>}{selectedAction === "secondary" && <div className="loopz-action-inspector"><h3>Loopz action</h3><p>Secondary buttons use the existing dismiss action.</p></div>}</aside></div>
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
  { id: "layout", name: "Layout", open: true, properties: ["display", "flex-direction", "justify-content", "align-items", "gap", "width", "max-width", "min-height", "padding", "margin"] },
  { id: "typography", name: "Typography", open: true, properties: ["font-family", "font-size", "font-weight", "line-height", "text-align", "color"] },
  { id: "appearance", name: "Appearance", open: true, properties: ["background-color", "border", "border-radius", "box-shadow", "opacity"] },
]; }

function hasUsableProjectData(projectData: Record<string, unknown>): boolean {
  const pages = projectData.pages;
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return pages.some(page => { const component = page && typeof page === "object" ? (page as { component?: unknown }).component : null; if (!component || typeof component !== "object") return false; const children = (component as { components?: unknown }).components; return Array.isArray(children) ? children.length > 0 : Boolean(children); });
}

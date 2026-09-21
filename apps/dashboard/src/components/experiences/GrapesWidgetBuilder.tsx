import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject, type UIEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Component, Editor } from "grapesjs";
import { Badge as BadgeIcon, Box, CircleDot, CircleUserRound, Code2, Columns3, Hand, Heading2, Image as ImageIcon, List, Maximize2, Minus, Monitor, MousePointer2, MousePointerClick, MoveVertical, Plus, Redo2, Rows3, ScanLine, SquareMousePointer, Star, Smartphone, Tablet, Type, Undo2, Video, X, type LucideIcon } from "lucide-react";
import "grapesjs/dist/css/grapes.min.css";
import "./GrapesWidgetBuilder.css";
import type { ExperienceAction, ExperienceContent, ExperienceDesign, ExperienceSize, SurveyQuestion, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { Button } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { Label } from "@movecues/ui";
import { Textarea } from "@movecues/ui";
import { builderSignature, createWidgetStarter, projectLegacyContent, sanitizeBuilderHtml, surveyQuestionMarkup, validateBuilderCss, type BuilderExport } from "./widgetBuilder";
import { FREE_AREA_CLASS, installWidgetInteractions, type FreeItemBox, type WidgetInteractionController } from "./grapesWidgetInteractions";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS, widgetSizeCss } from "./widgetSizing";
import { builderDebug, summarizeBuilder } from "./builderDebug";

interface Props {
  experienceKey: string;
  widgetType: WidgetType;
  interactionContext?: "guide" | "widget" | "survey";
  value?: WidgetBuilderState;
  content: ExperienceContent;
  design: ExperienceDesign;
  onChange: (value: BuilderExport) => void;
  onPrimaryActionChange: (action: ExperienceAction | undefined) => void;
  onSizeChange: (size: ExperienceSize) => void;
  surveyQuestions?: SurveyQuestion[];
}

export interface GrapesWidgetBuilderHandle { flush: () => void }

const AUTHORING_CANVAS_WIDTH = 1200;
const AUTHORING_CANVAS_HEIGHT = 900;
const MIN_CANVAS_ZOOM = 25;
const MAX_CANVAS_ZOOM = 200;
const CANVAS_ZOOM_STEP = 10;
const STYLE_CLASS_PREFIX = "movecues-style--";
// Keep the GrapesJS iframe on the same runtime baseline as the SDK Shadow DOM.
// Builder CSS is injected afterwards and remains free to override these defaults.
const SDK_BUTTON_BASELINE_CSS = "button{border:0;border-radius:7px;padding:8px 12px;font:600 13px ui-sans-serif,system-ui,sans-serif;cursor:pointer}";
let styleClassSequence = 0;

interface ViewportState { zoom: number; panX: number; panY: number }
interface PanGesture { pointerId: number; startX: number; startY: number; panX: number; panY: number }
type SelectedInteraction =
  | { kind: "primary" }
  | { kind: "secondary" }
  | { kind: "survey"; action: "back" | "next" | "submit" }
  | { kind: "button" }
  | null;

function interactionForComponent(component?: Component): SelectedInteraction {
  const attributes = component?.getAttributes?.() ?? {};
  if (attributes["data-movecues-option-id"]) return null;
  const slot = attributes["data-movecues-action-id"];
  if (slot === "primary" || slot === "secondary") return { kind: slot };
  const surveyAction = attributes["data-movecues-survey-action"];
  if (surveyAction === "back" || surveyAction === "next" || surveyAction === "submit") return { kind: "survey", action: surveyAction };
  if (component?.get?.("tagName") === "button" || component?.getClasses?.().includes("movecues-widget__button")) return { kind: "button" };
  return null;
}

export const GrapesWidgetBuilder = forwardRef<GrapesWidgetBuilderHandle, Props>(function GrapesWidgetBuilder({ experienceKey, widgetType, interactionContext = widgetType === "survey" ? "survey" : "widget", value, content, design, onChange, onPrimaryActionChange, onSizeChange, surveyQuestions }, ref) {
  const canvasViewportRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLDivElement>(null); const blocksRef = useRef<HTMLDivElement>(null); const stylesRef = useRef<HTMLDivElement>(null); const traitsRef = useRef<HTMLDivElement>(null); const editorRef = useRef<Editor | null>(null);
  const htmlHighlightRef = useRef<HTMLPreElement>(null); const cssHighlightRef = useRef<HTMLPreElement>(null);
  const applyingCodeRef = useRef(false);
  const flushExportRef = useRef<() => void>(() => void 0);
  const fitCanvasRef = useRef<() => void>(() => void 0);
  const scheduleCanvasFitRef = useRef<() => void>(() => void 0);
  const scheduleCanvasRefreshRef = useRef<() => void>(() => void 0);
  const applyViewportRef = useRef<(next?: Partial<ViewportState>, updateLabel?: boolean) => void>(() => void 0);
  const applySizeEnvelopeRef = useRef<(next: ExperienceDesign) => void>(() => void 0);
  const viewportRef = useRef<ViewportState>({ zoom: 100, panX: 0, panY: 0 });
  const panGestureRef = useRef<PanGesture | null>(null);
  const spacePressedRef = useRef(false);
  const handToolRef = useRef(false);
  const codeModeRef = useRef(false);
  const interactionControllerRef = useRef<WidgetInteractionController | null>(null);
  const selectedFreeItemRef = useRef<Component | null>(null);
  const surveyProjectionSignatureRef = useRef("");
  const editorExperienceKeyRef = useRef<string | null>(null);
  const projectDataRef = useRef<Record<string, unknown>>(value?.projectData ?? {});
  const lastPersistedCssRef = useRef(value?.css ?? "");
  const onChangeRef = useRef(onChange); const onSizeChangeRef = useRef(onSizeChange); const contentRef = useRef(content); const designRef = useRef(design); const lastSignature = useRef(value ? builderSignature(value) : "");
  const [ready, setReady] = useState(false); const [positioned, setPositioned] = useState(false); const [device, setDevice] = useState("Desktop"); const [codeMode, setCodeMode] = useState(false); const [codeHtml, setCodeHtml] = useState(value?.html ?? ""); const [codeCss, setCodeCss] = useState(value?.css ?? ""); const [codeError, setCodeError] = useState<string | null>(null); const [selectedInteraction, setSelectedInteraction] = useState<SelectedInteraction>(null); const [sidebarTab, setSidebarTab] = useState<"blocks" | "properties">("blocks"); const [zoomLabel, setZoomLabel] = useState(100); const [handTool, setHandTool] = useState(false); const [spacePressed, setSpacePressed] = useState(false); const [panning, setPanning] = useState(false); const [freeItemBox, setFreeItemBox] = useState<FreeItemBox | null>(null);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]); useEffect(() => { onSizeChangeRef.current = onSizeChange; }, [onSizeChange]); useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { designRef.current = design; applySizeEnvelopeRef.current(design); }, [design]);
  useEffect(() => { codeModeRef.current = codeMode; }, [codeMode]);
  useEffect(() => { handToolRef.current = handTool; }, [handTool]);
  useImperativeHandle(ref, () => ({ flush: () => flushExportRef.current() }), []);
  useEffect(() => { if (widgetType !== "survey" || !ready || !editorRef.current || editorExperienceKeyRef.current !== experienceKey || !surveyQuestions) return; const signature = `${experienceKey}:${JSON.stringify(surveyQuestions)}`; if (signature === surveyProjectionSignatureRef.current) return; builderDebug(experienceKey, "survey:projection:start", { questionCount: surveyQuestions.length, signature }); surveyProjectionSignatureRef.current = signature; syncSurveyComponents(editorRef.current, surveyQuestions); flushExportRef.current(); builderDebug(experienceKey, "survey:projection:complete"); }, [experienceKey, ready, surveyQuestions, widgetType]);

  useEffect(() => {
    let cancelled = false; let timer = 0; let initializationTimer = 0; let fitFrame = 0; let refreshFrame = 0; let editor: Editor | null = null; let initialized = false; let migratingComponentStyle = false; let resizeObserver: ResizeObserver | null = null; let canvasNavigationBound = false; let canvasViewportElement: HTMLDivElement | null = null;
    editorExperienceKeyRef.current = experienceKey; setReady(false); setPositioned(false); handToolRef.current = false;
    viewportRef.current = { zoom: 100, panX: 0, panY: 0 }; setZoomLabel(100); setHandTool(false); setSpacePressed(false); setPanning(false); setFreeItemBox(null); spacePressedRef.current = false; panGestureRef.current = null; selectedFreeItemRef.current = null;
    lastSignature.current = value ? builderSignature(value) : "";
    projectDataRef.current = value?.projectData ?? {};
    const starter = createWidgetStarter(widgetType, contentRef.current, design);
    lastPersistedCssRef.current = value?.css ?? starter.css;
    // HTML and CSS are the runtime contract shared with the SDK. GrapesJS
    // projectData is retained as compatibility metadata, but it is neither the
    // reload source nor regenerated during editing. Calling getProjectData while
    // the RTE is active makes GrapesJS synchronize text by removing and adding
    // components, which feeds back into our mutation listeners.
    const initialHtml = value ? sanitizeBuilderHtml(value.html, widgetType === "survey") : starter.html;
    const initialCss = value ? validateBuilderCss(value.css) : starter.css;
    builderDebug(experienceKey, "lifecycle:init", { widgetType, input: summarizeBuilder(value), loadSource: "canonical-html-css", ignoredProjectData: Boolean(value?.projectData), starter: { htmlLength: starter.html.length, cssLength: starter.css.length } }, "info");
    const rawEditorCss = () => editor?.getCss({ avoidProtected: true }) ?? "";
    const editorCss = () => validateBuilderCss(rawEditorCss());
    const emit = () => {
      if (!editor || cancelled) return;
      if (!initialized) { builderDebug(experienceKey, "export:blocked-during-hydration", { current: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); return; }
      try {
        const html = sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"); const css = editorCss();
        const builder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html, css }; const signature = builderSignature(builder);
        builderDebug(experienceKey, "export:captured", { snapshot: summarizeBuilder(builder), signature, previousSignature: lastSignature.current, dirtyCount: editor.getDirtyCount() });
        if (signature === lastSignature.current) { builderDebug(experienceKey, "export:skipped-unchanged"); return; }
        // A normal canvas mutation must never replace an already styled document
        // with an empty stylesheet. `applyCode` is the deliberate escape hatch for
        // users who actually want to clear all CSS. GrapesJS can briefly report an
        // empty composer while a project is being rehydrated, so repair it instead
        // of showing an alert and leaving the editor in that bad state.
        if (lastPersistedCssRef.current.trim() && !css.trim()) {
          builderDebug(experienceKey, "css:unexpected-empty", { snapshot: summarizeBuilder(builder), html, previousCss: lastPersistedCssRef.current }, "error");
          applyingCodeRef.current = true;
          try {
            editor.setStyle(lastPersistedCssRef.current);
            editor.clearDirtyCount();
          } finally { applyingCodeRef.current = false; }
          const restoredCss = editorCss();
          const restoredBuilder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html, css: restoredCss };
          lastSignature.current = builderSignature(restoredBuilder); setCodeHtml(html); setCodeCss(restoredCss); setCodeError(null);
          builderDebug(experienceKey, "css:self-healed", { snapshot: summarizeBuilder(restoredBuilder), restoredCss }, "warn");
          onChangeRef.current({ builder: restoredBuilder, content: projectLegacyContent(html, contentRef.current) });
          return;
        }
        lastSignature.current = signature; if (!interactionControllerRef.current?.isEditing()) editor.clearDirtyCount(); setCodeHtml(html); setCodeCss(css); setCodeError(null);
        lastPersistedCssRef.current = css;
        builderDebug(experienceKey, "export:dispatch", { snapshot: summarizeBuilder(builder), html, css }, "info");
        onChangeRef.current({ builder, content: projectLegacyContent(html, contentRef.current) });
      } catch (error) { const message = error instanceof Error ? error.message : "Builder content could not be exported."; builderDebug(experienceKey, "export:error", { message, stack: error instanceof Error ? error.stack : undefined }, "error"); setCodeError(message); }
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
    const scheduleCanvasRefresh = () => {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = window.requestAnimationFrame(() => {
        if (!editor || cancelled) return;
        editor.refresh();
        applyViewportRef.current();
      });
    };
    scheduleCanvasRefreshRef.current = scheduleCanvasRefresh;
    const schedule = (force = false, reason = "editor:update") => {
      if (!editor || applyingCodeRef.current) return;
      if (!initialized) { builderDebug(experienceKey, "export:schedule-blocked-during-hydration", { reason, force, current: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); return; }
      const dirtyCount = editor.getDirtyCount();
      if (!force && dirtyCount === 0) { builderDebug(experienceKey, "export:schedule-skipped-clean", { reason }); return; }
      clearTimeout(timer);
      builderDebug(experienceKey, "export:scheduled", { reason, force, dirtyCount, delayMs: 400 });
      timer = window.setTimeout(emit, 400);
    };
    const scheduleCustomMutation = () => schedule(true, "interaction:mutation");
    const selectCanonicalStyleTarget = (component?: Component) => {
      if (!editor || !component) return;
      const selector = canonicalStyleSelector(component);
      if (!selector) return;
      const rule = editor.Css.getRule(selector);
      if (rule) editor.StyleManager.select(rule, { component });
    };
    const persistComponentStyle = (target?: Component) => {
      if (!editor || applyingCodeRef.current || migratingComponentStyle) return;
      const component = target ?? editor.getSelected();
      builderDebug(experienceKey, "style:persist:start", { component: debugComponent(component), cssBefore: debugCss(rawEditorCss()) });
      if (component) {
        const componentStyle = component.getStyle();
        if (Object.keys(componentStyle).length > 0) {
          const selector = ensureCanonicalStyleSelector(component);
          const existing = editor.Css.getRule(selector)?.getStyle() ?? {};
          const componentId = component.getId?.();
          migratingComponentStyle = true;
          try {
            component.setStyle({});
            if (componentId) editor.Css.remove(`#${componentId}`);
            const rule = editor.Css.setRule(selector, { ...existing, ...componentStyle });
            builderDebug(experienceKey, "style:persist:migrated", { component: debugComponent(component), componentId, selector, componentStyle, existing, cssAfter: debugCss(rawEditorCss()) });
            if (editor.getSelected() === component) editor.StyleManager.select(rule, { component });
          } finally { migratingComponentStyle = false; }
        } else selectCanonicalStyleTarget(component);
      }
      schedule(true, "style:persist");
    };
    const releaseSpace = () => {
      if (!spacePressedRef.current) return;
      spacePressedRef.current = false; setSpacePressed(false);
      if (panGestureRef.current) { panGestureRef.current = null; setPanning(false); }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || codeModeRef.current || isEditableTarget(event.target)) return;
      event.preventDefault(); spacePressedRef.current = true; setSpacePressed(true);
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === "Space") releaseSpace(); };
    const onWindowBlur = () => releaseSpace();
    const zoomFromWheel = (event: WheelEvent, inFrame: boolean) => {
      if (!(event.ctrlKey || event.metaKey) || !canvasRef.current || !editor) return;
      event.preventDefault();
      const current = viewportRef.current; const nextZoom = clampCanvasZoom(current.zoom * Math.exp(-event.deltaY * 0.002));
      if (nextZoom === current.zoom) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const frameRect = inFrame ? editor.Canvas.getFrameEl()?.getBoundingClientRect() : undefined;
      const scale = current.zoom / 100;
      const pointerX = frameRect ? frameRect.left - canvasRect.left + event.clientX * scale : event.clientX - canvasRect.left;
      const pointerY = frameRect ? frameRect.top - canvasRect.top + event.clientY * scale : event.clientY - canvasRect.top;
      const ratio = nextZoom / current.zoom;
      applyViewportRef.current({ zoom: nextZoom, panX: pointerX - (pointerX - current.panX) * ratio, panY: pointerY - (pointerY - current.panY) * ratio });
    };
    const onOuterWheel = (event: WheelEvent) => zoomFromWheel(event, false);
    const onFrameWheel = (event: WheelEvent) => zoomFromWheel(event, true);
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onWindowBlur);
    flushExportRef.current = () => { builderDebug(experienceKey, "export:flush", { pendingTimer: Boolean(timer), initialized }, "info"); clearTimeout(timer); emit(); };
    const finishInitialization = (source: string) => {
      if (!editor || cancelled) return;
      if (initialized) return;
      const currentRoot = editor.getWrapper()?.find(".movecues-widget")[0];
      if (!currentRoot) {
        builderDebug(experienceKey, "lifecycle:ready-deferred-missing-root", { source, current: currentEditorDebugSnapshot(editor, widgetType) }, "warn");
        return;
      }
      builderDebug(experienceKey, "lifecycle:ready:start", { source, before: summarizeBuilder({ version: 1, projectData: projectDataRef.current, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: editorCss() }) }, "info");
      initialized = true; setReady(true);
      applyingCodeRef.current = true;
      const widgetRoot = editor.getWrapper()?.find(".movecues-widget")[0];
      if (widgetRoot) { widgetRoot.set("removable", false); widgetRoot.set("copyable", false); }
      interactionControllerRef.current?.syncFreeAreas();
      editor.clearDirtyCount();
      applyingCodeRef.current = false;
      const html = sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"); const css = editorCss(); setCodeHtml(html); setCodeCss(css);
      builderDebug(experienceKey, "lifecycle:ready:complete", { snapshot: summarizeBuilder({ version: 1, projectData: projectDataRef.current, html, css }), html, css }, "info");
      if (!value) lastSignature.current = "";
      emit();
      if (!canvasNavigationBound) {
        canvasNavigationBound = true;
        canvasViewportElement = canvasViewportRef.current;
        canvasViewportElement?.addEventListener("wheel", onOuterWheel, { passive: false });
        editor.Canvas.getDocument()?.addEventListener("wheel", onFrameWheel, { passive: false });
        editor.Canvas.getDocument()?.addEventListener("keydown", onKeyDown);
        editor.Canvas.getDocument()?.addEventListener("keyup", onKeyUp);
      }
      scheduleCanvasFit();
    };
    void import("grapesjs").then(module => {
      if (cancelled || !canvasRef.current || !blocksRef.current || !stylesRef.current || !traitsRef.current) return;
      const grapesjs = module.default;
      const envelopeCss = builderSizeEnvelopeCss(widgetType, designRef.current);
      editor = grapesjs.init({
        container: canvasRef.current, height: "100%", width: "auto", storageManager: false, panels: { defaults: [] }, parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } }, canvasCss: `html{width:100%;height:100%;min-width:${AUTHORING_CANVAS_WIDTH}px;min-height:${AUTHORING_CANVAS_HEIGHT}px;overflow:hidden;background:#f8fafc}body{box-sizing:border-box;width:100%;min-width:${AUTHORING_CANVAS_WIDTH}px;min-height:${AUTHORING_CANVAS_HEIGHT}px;margin:0;padding:96px 80px 160px;display:flex;justify-content:center;align-items:flex-start;background:#f8fafc}*{box-sizing:border-box}${SDK_BUTTON_BASELINE_CSS}${envelopeCss}`,
        selectorManager: { componentFirst: true },
        components: initialHtml,
        style: initialCss,
        deviceManager: { devices: [{ id: "desktop", name: "Desktop", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px` }, { id: "tablet", name: "Tablet", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "768px" }, { id: "mobile", name: "Mobile", width: `${AUTHORING_CANVAS_WIDTH}px`, height: `${AUTHORING_CANVAS_HEIGHT}px`, widthMedia: "390px" }] },
        blockManager: { appendTo: blocksRef.current, blocks: blocks() },
        traitManager: { appendTo: traitsRef.current },
        styleManager: { appendTo: stylesRef.current, sectors: styleSectors() },
        plugins: [instance => {
          instance.DomComponents.addType("movecues-widget-root", { isComponent: element => element.classList?.contains("movecues-widget") ? { type: "movecues-widget-root" } : false, model: { defaults: { tagName: "section", removable: false, copyable: false } } });
          instance.DomComponents.addType("movecues-survey-controls", { isComponent: element => element.hasAttribute?.("data-movecues-survey-controls") ? { type: "movecues-survey-controls" } : false, model: { defaults: { tagName: "div", removable: false, copyable: false } } });
          instance.DomComponents.addType("movecues-survey-question", { isComponent: element => element.hasAttribute?.("data-movecues-question-id") ? { type: "movecues-survey-question" } : false, model: { defaults: { droppable: true, editable: false, removable: false, copyable: false, traits: [] } } });
          instance.DomComponents.addType("movecues-button", { isComponent: element => element.tagName === "BUTTON" && (element.hasAttribute?.("data-movecues-action-id") || element.hasAttribute?.("data-movecues-survey-action")) ? { type: "movecues-button" } : false, model: { defaults: { tagName: "button", droppable: false, editable: true, removable: true, copyable: false, traits: [] } } });
          instance.DomComponents.addType("movecues-free-area", { isComponent: element => element.classList?.contains(FREE_AREA_CLASS) ? { type: "movecues-free-area" } : false, model: { defaults: { tagName: "div", classes: [FREE_AREA_CLASS], droppable: true } } });
          instance.DomComponents.addType("movecues-video", { isComponent: element => element.tagName === "VIDEO" ? { type: "movecues-video" } : false, model: { defaults: { tagName: "video", droppable: false, traits: [{ type: "text", name: "src", label: "Source URL" }, { type: "checkbox", name: "autoplay", label: "Autoplay" }, { type: "checkbox", name: "muted", label: "Muted" }, { type: "checkbox", name: "loop", label: "Loop" }, { type: "checkbox", name: "controls", label: "Controls" }] } } });
          instance.DomComponents.addType("movecues-avatar-image", { isComponent: element => element.tagName === "IMG" && element.classList?.contains("movecues-widget__avatar-image") ? { type: "movecues-avatar-image" } : false, model: { defaults: { tagName: "img", droppable: false, traits: [{ type: "text", name: "src", label: "Image URL" }, { type: "text", name: "alt", label: "Alt text" }] } } });
          instance.DomComponents.addType("movecues-embed-frame", { isComponent: element => element.tagName === "IFRAME" && element.classList?.contains("movecues-widget__embed-frame") ? { type: "movecues-embed-frame" } : false, model: { defaults: { tagName: "iframe", droppable: false, traits: [{ type: "text", name: "src", label: "URL" }, { type: "text", name: "title", label: "Title" }] } } });
        }, instance => { interactionControllerRef.current = installWidgetInteractions(instance, { widgetType, design: () => designRef.current, onRootResize: (size, commit) => { const next = { ...designRef.current, size }; applySizeEnvelopeRef.current(next); if (commit) { designRef.current = next; onSizeChangeRef.current(size); } }, onFreeItemChange: (component, box) => { selectedFreeItemRef.current = component; setFreeItemBox(box); }, onMutation: scheduleCustomMutation, canStartFreeDrag: target => !handToolRef.current && !spacePressedRef.current && !codeModeRef.current && !isEditableTarget(target) }); }],
      });
      if (cancelled) { editor.destroy(); return; }
      editorRef.current = editor;
      applyViewportRef.current = (next = {}, updateLabel = true) => {
        if (!editor || cancelled) return;
        const previous = viewportRef.current;
        const viewport = { zoom: clampCanvasZoom(next.zoom ?? previous.zoom), panX: next.panX ?? previous.panX, panY: next.panY ?? previous.panY };
        viewportRef.current = viewport;
        editor.Canvas.setZoom(viewport.zoom);
        editor.Canvas.setCoords(viewport.panX, viewport.panY);
        if (updateLabel) setZoomLabel(Math.round(viewport.zoom));
      };
      applySizeEnvelopeRef.current = next => {
        if (!editor || cancelled) return;
        const documentValue = editor.Canvas.getDocument();
        if (!documentValue) return;
        let style = documentValue.head.querySelector<HTMLStyleElement>("style[data-movecues-size-envelope]");
        if (!style) { style = documentValue.createElement("style"); style.dataset.movecuesSizeEnvelope = ""; documentValue.head.appendChild(style); }
        style.textContent = builderSizeEnvelopeCss(widgetType, next);
      };
      fitCanvasRef.current = () => {
        if (!editor || cancelled || !canvasRef.current) return;
        const widget = editor.getWrapper()?.find(".movecues-widget")[0]?.getEl();
        if (!widget) { setPositioned(true); return; }
        const availableWidth = canvasRef.current.clientWidth - 80;
        const availableHeight = canvasRef.current.clientHeight - 96;
        if (availableWidth <= 0 || availableHeight <= 0) { setPositioned(true); return; }
        const widgetWidth = Math.max(1, widget.offsetWidth);
        const widgetHeight = Math.max(1, widget.offsetHeight);
        const zoom = Math.min(1, Math.max(MIN_CANVAS_ZOOM / 100, availableWidth / widgetWidth), Math.max(MIN_CANVAS_ZOOM / 100, availableHeight / widgetHeight));
        applyViewportRef.current({ zoom: zoom * 100, panX: (canvasRef.current.clientWidth - AUTHORING_CANVAS_WIDTH * zoom) / 2, panY: 0 });
        setPositioned(true);
      };
      if (typeof ResizeObserver !== "undefined" && canvasRef.current) {
        resizeObserver = new ResizeObserver(scheduleCanvasRefresh);
        resizeObserver.observe(canvasRef.current);
      }
      applySizeEnvelopeRef.current(designRef.current);
      const selectAction = (component?: Component) => { setSelectedInteraction(interactionForComponent(component)); interactionControllerRef.current?.select(component); selectCanonicalStyleTarget(component); setSidebarTab("properties"); };
      const keepOneActionPerSlot = (component: Component) => { if (widgetType === "survey") return; const slot = component.getAttributes()?.["data-movecues-action-id"]; if (slot !== "primary" && slot !== "secondary") return; const matches = editor!.getWrapper()!.find(`[data-movecues-action-id="${slot}"]`); if (matches.length > 1) { component.remove(); editor!.select(matches[0]); } };
      editor.on("update", () => { builderDebug(experienceKey, "grapes:update", { dirtyCount: editor?.getDirtyCount() }); schedule(false, "grapes:update"); });
      editor.on("component:styleUpdate", (component: Component) => { builderDebug(experienceKey, "grapes:component-style-update", { component: debugComponent(component), css: debugCss(rawEditorCss()) }); persistComponentStyle(component); });
      editor.on("style:property:update", () => { builderDebug(experienceKey, "grapes:style-property-update", { selected: debugComponent(editor?.getSelected()), css: debugCss(rawEditorCss()) }); queueMicrotask(() => persistComponentStyle()); });
      editor.on("component:selected", (component: Component) => { builderDebug(experienceKey, "grapes:component-selected", { component: debugComponent(component) }); selectAction(component); });
      editor.on("component:add", (component: Component) => { builderDebug(experienceKey, "grapes:component-add", { component: debugComponent(component), snapshot: currentEditorDebugSnapshot(editor, widgetType) }, "info"); keepOneActionPerSlot(component); if (!applyingCodeRef.current) installNewBlockStyles(editor!, component); });
      editor.on("component:remove", (component: Component) => { builderDebug(experienceKey, "grapes:component-remove", { component: debugComponent(component), snapshot: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); });
      editor.on("load", () => { builderDebug(experienceKey, "grapes:load"); finishInitialization("grapes:load"); }); editor.onReady(() => { builderDebug(experienceKey, "grapes:on-ready"); finishInitialization("grapes:on-ready"); });
      initializationTimer = window.setTimeout(() => {
        if (initialized || cancelled) return;
        builderDebug(experienceKey, "lifecycle:hydration-timeout", { current: currentEditorDebugSnapshot(editor, widgetType), input: summarizeBuilder(value) }, "error");
        setReady(true); setPositioned(true); setCodeError("GrapesJS did not finish restoring this design. Autosave is disabled to protect the saved HTML and CSS.");
      }, 5000);
    }).catch(error => { builderDebug(experienceKey, "lifecycle:init-error", { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, "error"); setReady(true); setPositioned(true); setCodeError("GrapesJS could not be loaded."); });
    return () => {
      builderDebug(experienceKey, "lifecycle:destroy", { initialized, current: currentEditorDebugSnapshot(editor, widgetType) }, "info");
      cancelled = true; clearTimeout(timer); clearTimeout(initializationTimer); window.cancelAnimationFrame(fitFrame); window.cancelAnimationFrame(refreshFrame); resizeObserver?.disconnect();
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onWindowBlur);
      canvasViewportElement?.removeEventListener("wheel", onOuterWheel);
      editor?.Canvas.getDocument()?.removeEventListener("wheel", onFrameWheel);
      editor?.Canvas.getDocument()?.removeEventListener("keydown", onKeyDown);
      editor?.Canvas.getDocument()?.removeEventListener("keyup", onKeyUp);
      flushExportRef.current = () => void 0; fitCanvasRef.current = () => void 0; scheduleCanvasFitRef.current = () => void 0; scheduleCanvasRefreshRef.current = () => void 0; applyViewportRef.current = () => void 0; applySizeEnvelopeRef.current = () => void 0; interactionControllerRef.current?.destroy(); interactionControllerRef.current = null; selectedFreeItemRef.current = null; editorRef.current = null; if (editorExperienceKeyRef.current === experienceKey) editorExperienceKeyRef.current = null; editor?.destroy();
    };
  // A different draft gets a separate editor instance; parent state updates do not reinitialize GrapesJS.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceKey]);

  useEffect(() => {
    if (codeMode) return;
    const timer = window.setTimeout(() => {
      scheduleCanvasRefreshRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [codeMode]);

  const chooseDevice = (name: string) => { editorRef.current?.setDevice(name); setDevice(name); scheduleCanvasFitRef.current(); };
  const previewSize = (size: ExperienceSize) => {
    applySizeEnvelopeRef.current({ ...designRef.current, size });
  };
  const toggleCode = () => { builderDebug(experienceKey, "code:toggle", { opening: !codeMode, current: currentEditorDebugSnapshot(editorRef.current, widgetType) }, "info"); if (!codeMode && editorRef.current) { setCodeHtml(sanitizeBuilderHtml(editorRef.current.getHtml(), widgetType === "survey")); setCodeCss(validateBuilderCss(editorRef.current.getCss({ avoidProtected: true }) ?? "")); } setCodeError(null); setCodeMode(value => !value); };
  const formatCode = () => { setCodeHtml(formatHtml(codeHtml)); setCodeCss(formatCss(codeCss)); setCodeError(null); };
  const syncCodeScroll = (event: UIEvent<HTMLTextAreaElement>, highlight: RefObject<HTMLPreElement | null>) => { if (highlight.current) { highlight.current.scrollTop = event.currentTarget.scrollTop; highlight.current.scrollLeft = event.currentTarget.scrollLeft; } };
  const applyCode = () => { const editor = editorRef.current; if (!editor) return; builderDebug(experienceKey, "code:apply:start", { htmlLength: codeHtml.length, cssLength: codeCss.length, html: codeHtml, css: codeCss }, "info"); try { const html = sanitizeBuilderHtml(codeHtml, widgetType === "survey"); const css = validateBuilderCss(codeCss); applyingCodeRef.current = true; builderDebug(experienceKey, "code:css-clear", { before: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); editor.setComponents(html); editor.Css.clear(); editor.setStyle(css); interactionControllerRef.current?.syncFreeAreas(); if (widgetType === "survey" && surveyQuestions) syncSurveyComponents(editor, surveyQuestions); if (!interactionControllerRef.current?.isEditing()) editor.clearDirtyCount(); const builder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? "") }; lastSignature.current = builderSignature(builder); lastPersistedCssRef.current = builder.css; setCodeHtml(builder.html); setCodeCss(builder.css); setCodeError(null); builderDebug(experienceKey, "code:apply:dispatch", { snapshot: summarizeBuilder(builder), html: builder.html, css: builder.css }, "info"); onChangeRef.current({ builder, content: projectLegacyContent(builder.html, contentRef.current) }); scheduleCanvasRefreshRef.current(); } catch (error) { const message = error instanceof Error ? error.message : "The code could not be applied."; builderDebug(experienceKey, "code:apply:error", { message, stack: error instanceof Error ? error.stack : undefined }, "error"); setCodeError(message); } finally { applyingCodeRef.current = false; } };
  const updateFreeItem = (property: keyof FreeItemBox, value: string) => {
    const component = selectedFreeItemRef.current; const numeric = Number(value);
    if (!component || !Number.isFinite(numeric)) return;
    interactionControllerRef.current?.updateFreeItemBox(component, { [property]: numeric });
  };
  const zoomBy = (delta: number) => {
    if (!canvasRef.current) return;
    const current = viewportRef.current; const nextZoom = clampCanvasZoom(current.zoom + delta);
    if (nextZoom === current.zoom) return;
    const pointerX = canvasRef.current.clientWidth / 2; const pointerY = canvasRef.current.clientHeight / 2; const ratio = nextZoom / current.zoom;
    applyViewportRef.current({ zoom: nextZoom, panX: pointerX - (pointerX - current.panX) * ratio, panY: pointerY - (pointerY - current.panY) * ratio });
  };
  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (!handTool && !spacePressedRef.current)) return;
    event.preventDefault(); event.stopPropagation();
    const current = viewportRef.current;
    panGestureRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: current.panX, panY: current.panY };
    event.currentTarget.setPointerCapture?.(event.pointerId); setPanning(true);
  };
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    applyViewportRef.current({ panX: gesture.panX + event.clientX - gesture.startX, panY: gesture.panY + event.clientY - gesture.startY }, false);
  };
  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panGestureRef.current?.pointerId !== event.pointerId) return;
    panGestureRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); setPanning(false);
  };
  const currentAction = content.primaryAction;
  const displayedActionType: ExperienceAction["type"] = interactionContext === "guide" ? "next_step" : currentAction?.type === "open_url" || currentAction?.type === "track_event" ? currentAction.type : "dismiss";
  const updateActionType = (type: ExperienceAction["type"]) => { const label = currentAction?.label ?? "Continue"; onPrimaryActionChange(type === "open_url" ? { label, type, url: currentAction?.url ?? "https://example.com" } : type === "track_event" ? { label, type, eventName: currentAction?.eventName ?? "experience_action" } : type === "next_step" ? { label, type } : { label, type: "dismiss" }); };
  const selectedSurveyAction = selectedInteraction?.kind === "survey" ? selectedInteraction.action : selectedInteraction?.kind === "primary" || selectedInteraction?.kind === "secondary" ? "dismiss" : "";
  const updateSurveyAction = (value: "" | "dismiss" | "back" | "next" | "submit") => {
    const component = editorRef.current?.getSelected();
    if (!component) return;
    const attributes = { ...component.getAttributes() };
    delete attributes["data-movecues-action-id"];
    delete attributes["data-movecues-survey-action"];
    if (value === "dismiss") attributes["data-movecues-action-id"] = component.getClasses?.().includes("movecues-widget__button--secondary") ? "secondary" : "primary";
    if (value === "back" || value === "next" || value === "submit") attributes["data-movecues-survey-action"] = value;
    component.setAttributes(attributes);
    setSelectedInteraction(interactionForComponent(component));
  };
  const interactionInspector = selectedInteraction && <div className="movecues-action-inspector"><h3>Interaction</h3>{interactionContext === "survey" ? <Label>On click<select value={selectedSurveyAction} onChange={event => updateSurveyAction(event.target.value as "" | "dismiss" | "back" | "next" | "submit")}><option value="">No action</option><optgroup label="General"><option value="dismiss">Dismiss experience</option></optgroup><optgroup label="Survey"><option value="back">Survey: Back</option><option value="next">Survey: Next</option><option value="submit">Survey: Submit</option></optgroup></select></Label> : selectedInteraction.kind === "primary" ? <Label>On click<select value={displayedActionType} onChange={event => updateActionType(event.target.value as ExperienceAction["type"])}>{interactionContext === "guide" ? <option value="next_step">Next step</option> : <><option value="dismiss">Dismiss experience</option><option value="open_url">Open URL</option><option value="track_event">Track event</option></>}</select></Label> : selectedInteraction.kind === "secondary" ? <><p className="movecues-action-inspector__label">On click</p><p>Dismiss experience</p></> : null}{interactionContext !== "survey" && selectedInteraction.kind === "primary" && displayedActionType === "open_url" && <Label>URL<Input type="url" value={currentAction?.type === "open_url" ? currentAction.url ?? "" : ""} onChange={event => onPrimaryActionChange({ label: currentAction?.label ?? "Continue", type: "open_url", url: event.target.value })} /></Label>}{interactionContext !== "survey" && selectedInteraction.kind === "primary" && displayedActionType === "track_event" && <Label>Event name<Input value={currentAction?.type === "track_event" ? currentAction.eventName ?? "" : ""} onChange={event => onPrimaryActionChange({ label: currentAction?.label ?? "Continue", type: "track_event", eventName: event.target.value })} /></Label>}</div>;

  return <div className="movecues-builder-shell">
    <div className="movecues-builder-toolbar"><div className="movecues-builder-toolbar__group movecues-builder-toolbar__devices movecues-builder-device-switcher" role="group" aria-label="Preview device">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <Button key={String(name)} type="button" size="icon" variant="ghost" className={device === name ? "movecues-builder-device-switcher__button movecues-builder-device-switcher__button--active" : "movecues-builder-device-switcher__button"} aria-label={String(name)} aria-pressed={device === name} onClick={() => chooseDevice(String(name))}><Icon className="size-4" /></Button>)}</div><div className="movecues-builder-toolbar__group movecues-builder-toolbar__controls">{!codeMode && <div className="movecues-builder-toolbar__cluster"><Button type="button" size="icon" variant="outline" aria-label="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Fit" onClick={() => fitCanvasRef.current()}><ScanLine /></Button></div>}<div className="movecues-builder-toolbar__cluster"><Button type="button" size="icon" variant={!handTool ? "default" : "outline"} aria-label="Select tool" onClick={() => setHandTool(false)}><MousePointer2 /></Button><Button type="button" size="icon" variant={handTool ? "default" : "outline"} aria-label="Hand tool" aria-pressed={handTool} onClick={() => setHandTool(true)}><Hand /></Button></div><div className="movecues-builder-toolbar__cluster"><Button type="button" size="icon" variant={codeMode ? "default" : "outline"} aria-label="Toggle HTML and CSS editor" onClick={toggleCode}><Code2 /></Button></div></div></div>
    <div className={`movecues-builder-code${codeMode ? "" : " movecues-builder-view--hidden"}`} aria-hidden={!codeMode}><Label>HTML<div className="movecues-builder-code__editor"><pre ref={htmlHighlightRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightHtml(codeHtml) }} /><Textarea className="movecues-builder-code__input" aria-label="Builder HTML" spellCheck={false} value={codeHtml} onChange={event => setCodeHtml(event.target.value)} onScroll={event => syncCodeScroll(event, htmlHighlightRef)} /></div></Label><Label>CSS<div className="movecues-builder-code__editor"><pre ref={cssHighlightRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightCss(codeCss) }} /><Textarea className="movecues-builder-code__input" aria-label="Builder CSS" spellCheck={false} value={codeCss} onChange={event => setCodeCss(event.target.value)} onScroll={event => syncCodeScroll(event, cssHighlightRef)} /></div></Label><div className="col-span-full flex items-center gap-3"><Button type="button" variant="outline" onClick={formatCode}>Format HTML and CSS</Button><Button type="button" onClick={applyCode}>Apply HTML and CSS</Button>{codeError && <p className="m-0 text-sm text-destructive">{codeError}</p>}</div></div>
    {!codeMode && codeError && <div className="movecues-builder-error" role="alert">Builder changes could not be saved: {codeError}</div>}
    <div className={`movecues-builder-workspace${codeMode ? " movecues-builder-view--hidden" : ""}`} aria-hidden={codeMode}><aside className="movecues-builder-panel"><div className="movecues-builder-tabs" role="tablist" aria-label="Builder sidebar"><button type="button" role="tab" id="movecues-builder-blocks-tab" aria-selected={sidebarTab === "blocks"} aria-controls="movecues-builder-blocks-panel" onClick={() => setSidebarTab("blocks")}>Blocks</button><button type="button" role="tab" id="movecues-builder-properties-tab" aria-selected={sidebarTab === "properties"} aria-controls="movecues-builder-properties-panel" onClick={() => setSidebarTab("properties")}>Properties</button></div><div className={`movecues-builder-tab-panel${sidebarTab === "blocks" ? "" : " movecues-builder-tab-panel--hidden"}`} role="tabpanel" id="movecues-builder-blocks-panel" aria-labelledby="movecues-builder-blocks-tab"><p className="movecues-builder-hint">Drag blocks into the canvas, then select an element to customize it.</p><div ref={blocksRef} /></div><div className={`movecues-builder-tab-panel${sidebarTab === "properties" ? "" : " movecues-builder-tab-panel--hidden"}`} role="tabpanel" id="movecues-builder-properties-panel" aria-labelledby="movecues-builder-properties-tab"><WidgetSizeEditor widgetType={widgetType} design={design} onPreview={previewSize} onChange={onSizeChange} />{freeItemBox && <div className="movecues-position-inspector"><h3>Position</h3><div className="movecues-position-grid">{([['x', 'X'], ['y', 'Y'], ['width', 'W'], ['height', 'H']] as const).map(([property, label]) => <Label key={property}>{label}<Input aria-label={`Position ${label}`} type="number" value={Math.round(freeItemBox[property])} onChange={event => updateFreeItem(property, event.target.value)} /></Label>)}</div><div className="movecues-position-actions"><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "forward")}>Bring forward</Button><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "backward")}>Send backward</Button></div></div>}<div ref={traitsRef} />{interactionInspector}<div ref={stylesRef} /></div></aside><div ref={canvasViewportRef} className={`movecues-builder-canvas${handTool || spacePressed ? " movecues-builder-canvas--pan-ready" : ""}${panning ? " movecues-builder-canvas--panning" : ""}`}><div ref={canvasRef} className="movecues-builder-editor" /><div className={`movecues-builder-pan-layer${handTool || spacePressed || panning ? " movecues-builder-pan-layer--active" : ""}`} aria-hidden="true" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} />{(!ready || !positioned) && <div className="movecues-builder-loading">Loading builder…</div>}</div></div>
    {!codeMode && <div className="movecues-builder-canvas-zoom" role="group" aria-label="Canvas zoom"><Button type="button" size="icon" variant="outline" aria-label="Zoom out" disabled={zoomLabel <= MIN_CANVAS_ZOOM} onClick={() => zoomBy(-CANVAS_ZOOM_STEP)}><Minus /></Button><output className="movecues-builder-zoom" aria-label="Zoom percentage">{zoomLabel}%</output><Button type="button" size="icon" variant="outline" aria-label="Zoom in" disabled={zoomLabel >= MAX_CANVAS_ZOOM} onClick={() => zoomBy(CANVAS_ZOOM_STEP)}><Plus /></Button></div>}
  </div>;
});

function formatHtml(source: string): string {
  const lines = source.trim().replace(/>\s*</g, ">\n<").split("\n");
  let indent = 0;
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<\//.test(trimmed)) indent = Math.max(0, indent - 1);
    const formatted = `${"  ".repeat(indent)}${trimmed}`;
    if (/^<(?![!/])[^>]*[^/]>$/.test(trimmed) && !/<\/[^>]+>$/.test(trimmed) && !/^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i.test(trimmed)) indent += 1;
    return formatted;
  }).filter(Boolean).join("\n");
}

function formatCss(source: string): string {
  const lines: string[] = [];
  let buffer = ""; let indent = 0; let quote = ""; let escaped = false; let inComment = false;
  const write = (value: string) => { const trimmed = value.trim(); if (trimmed) lines.push(`${"  ".repeat(indent)}${trimmed}`); };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]; const next = source[index + 1];
    if (inComment) { buffer += character; if (character === "*" && next === "/") { buffer += next; index += 1; write(buffer); buffer = ""; inComment = false; } continue; }
    if (quote) { buffer += character; if (!escaped && character === quote) quote = ""; escaped = !escaped && character === "\\"; continue; }
    if (character === "'" || character === '"') { quote = character; buffer += character; continue; }
    if (character === "/" && next === "*") { write(buffer); buffer = "/*"; index += 1; inComment = true; continue; }
    if (character === "{") { write(`${buffer.trim()} {`); buffer = ""; indent += 1; continue; }
    if (character === ";") { write(`${buffer.trim()};`); buffer = ""; continue; }
    if (character === "}") { write(buffer); buffer = ""; indent = Math.max(0, indent - 1); write("}"); continue; }
    buffer += character;
  }
  write(buffer);
  return lines.join("\n");
}

function escapeCode(source: string): string {
  return source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightHtml(source: string): string {
  return escapeCode(source).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([A-Za-z][\w:-]*)([^]*?)(\/?&gt;)/g, (_match, comment: string, opening: string, tag: string, attributes: string, closing: string) => {
    if (comment) return `<span class="token-comment">${comment}</span>`;
    const highlightedAttributes = attributes.replace(/(\s)([\w:-]+)(=)("[^"]*"|'[^']*'|[^\s]+)/g, (_attribute: string, space: string, name: string, equals: string, value: string) => `${space}<span class="token-attribute">${name}</span>${equals}<span class="token-string">${value}</span>`);
    return `<span class="token-punctuation">${opening}</span><span class="token-tag">${tag}</span>${highlightedAttributes}<span class="token-punctuation">${closing}</span>`;
  });
}

function highlightCss(source: string): string {
  return escapeCode(source).replace(/(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|([^{};]+)(?=\s*\{)|([\w-]+)(?=\s*:)/g, (_match, comment: string, string: string, selector: string, property: string) => comment ? `<span class="token-comment">${comment}</span>` : string ? `<span class="token-string">${string}</span>` : selector ? `<span class="token-selector">${selector}</span>` : `<span class="token-property">${property}</span>`);
}

function clampCanvasZoom(value: number): number {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, Number.isFinite(value) ? value : 100));
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as { closest?: (selector: string) => Element | null } | null;
  return Boolean(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
}

function blocks() { return [
  { id: "free-area", label: "Free Area", media: blockIcon(Maximize2), category: "Layout", content: { type: "movecues-free-area", tagName: "div", classes: [FREE_AREA_CLASS] } },
  { id: "container", label: "Container", media: blockIcon(Box), category: "Layout", content: { type: "default", tagName: "div", classes: ["movecues-widget__container"], components: "Container" } },
  { id: "row", label: "Row", media: blockIcon(Rows3), category: "Layout", content: '<div class="movecues-widget__row"><div class="movecues-widget__column">Column</div><div class="movecues-widget__column">Column</div></div>' },
  { id: "columns", label: "Columns", media: blockIcon(Columns3), category: "Layout", content: '<div class="movecues-widget__columns"><div class="movecues-widget__column">Left</div><div class="movecues-widget__column">Right</div></div>' },
  { id: "heading", label: "Heading", media: blockIcon(Heading2), category: "Content", content: '<h2 class="movecues-widget__heading">Heading</h2>' },
  { id: "text", label: "Text", media: blockIcon(Type), category: "Content", content: '<p class="movecues-widget__body">Add your message.</p>' },
  { id: "image", label: "Image", media: blockIcon(ImageIcon), category: "Content", content: { type: "image", tagName: "img", attributes: { class: "movecues-widget__image", alt: "" } }, activate: true },
  { id: "icon", label: "Icon", media: blockIcon(Star), category: "Content", content: '<span class="movecues-widget__icon" role="img" aria-label="Icon">★</span>' },
  { id: "divider", label: "Divider", media: blockIcon(Minus), category: "Content", content: '<hr class="movecues-widget__divider">' },
  { id: "video", label: "Video", media: blockIcon(Video), category: "Content", content: { type: "default", tagName: "div", classes: ["movecues-widget__video"], components: [{ type: "movecues-video", tagName: "video", attributes: { controls: "", playsinline: "", muted: "" }, components: [{ tagName: "source", attributes: { src: "" } }] }] } },
  { id: "badge", label: "Badge", media: blockIcon(BadgeIcon), category: "Content", content: '<span class="movecues-widget__badge">New</span>' },
  { id: "avatar", label: "Avatar", media: blockIcon(CircleUserRound), category: "Content", content: { type: "default", tagName: "div", classes: ["movecues-widget__avatar"], components: [{ type: "movecues-avatar-image", tagName: "img", classes: ["movecues-widget__avatar-image"], attributes: { src: "", alt: "" } }] } },
  { id: "list", label: "List", media: blockIcon(List), category: "Content", content: '<ul class="movecues-widget__list"><li>First item</li><li>Second item</li><li>Third item</li></ul>' },
  { id: "spacer", label: "Spacer", media: blockIcon(MoveVertical), category: "Layout", content: '<div class="movecues-widget__spacer">&nbsp;</div>' },
  { id: "button", label: "Button", media: blockIcon(MousePointerClick), category: "Actions", content: '<button class="movecues-widget__button" data-movecues-action-id="primary">Continue</button>' },
  { id: "secondary-button", label: "Secondary button", media: blockIcon(SquareMousePointer), category: "Actions", content: '<button class="movecues-widget__button movecues-widget__button--secondary" data-movecues-action-id="secondary">Dismiss</button>' },
  { id: "embed", label: "Embed", media: blockIcon(Code2), category: "Embed", content: { type: "default", tagName: "div", classes: ["movecues-widget__embed"], components: [{ type: "movecues-embed-frame", tagName: "iframe", classes: ["movecues-widget__embed-frame"], attributes: { src: "", title: "Embedded content", loading: "lazy" } }] } },
  { id: "progress", label: "Progress", media: blockIcon(CircleDot), category: "Guide", content: '<div class="movecues-widget__progress" aria-label="Progress"><span class="movecues-widget__progress-dot movecues-widget__progress-dot--active"></span><span class="movecues-widget__progress-dot"></span><span class="movecues-widget__progress-dot"></span></div>' },
  { id: "close", label: "Close", media: blockIcon(X), category: "Guide", content: '<button class="movecues-widget__close" type="button" aria-label="Close">&times;</button>' },
]; }

function blockIcon(Icon: LucideIcon): string {
  return renderToStaticMarkup(<Icon aria-hidden="true" focusable="false" strokeWidth={1.8} />);
}

const NEW_BLOCK_STYLES: Record<string, Array<[string, Record<string, string>]>> = {
  "movecues-widget__video": [
    [".movecues-widget .movecues-widget__video", { width: "100%", overflow: "hidden", "border-radius": "8px", background: "rgba(15,23,42,.08)" }],
    [".movecues-widget .movecues-widget__video video", { display: "block", width: "100%", "aspect-ratio": "16 / 9", background: "rgba(15,23,42,.08)" }],
  ],
  "movecues-widget__badge": [[".movecues-widget .movecues-widget__badge", { display: "inline-flex", "align-items": "center", padding: "2px 8px", "border-radius": "999px", background: "rgba(15,23,42,.08)", color: "inherit", "font-size": "12px", "line-height": "1.5" }]],
  "movecues-widget__avatar": [
    [".movecues-widget .movecues-widget__avatar", { width: "40px", height: "40px", overflow: "hidden", "border-radius": "50%", background: "rgba(15,23,42,.08)" }],
    [".movecues-widget .movecues-widget__avatar img", { display: "block", width: "100%", height: "100%", "object-fit": "cover" }],
  ],
  "movecues-widget__list": [[".movecues-widget .movecues-widget__list", { margin: "0", "padding-left": "20px", "line-height": "1.5" }]],
  "movecues-widget__embed": [
    [".movecues-widget .movecues-widget__embed", { width: "100%", overflow: "hidden", "border-radius": "8px", background: "rgba(15,23,42,.08)" }],
    [".movecues-widget .movecues-widget__embed iframe", { display: "block", width: "100%", "min-height": "240px", border: "0" }],
  ],
  "movecues-widget__progress": [
    [".movecues-widget .movecues-widget__progress", { display: "flex", "align-items": "center", gap: "6px", color: "inherit" }],
    [".movecues-widget .movecues-widget__progress-dot", { display: "block", width: "8px", height: "8px", "border-radius": "50%", background: "currentColor", opacity: ".3" }],
    [".movecues-widget .movecues-widget__progress-dot--active", { opacity: "1" }],
  ],
  "movecues-widget__close": [[".movecues-widget .movecues-widget__close", { display: "inline-grid", width: "32px", height: "32px", "place-items": "center", padding: "0", border: "0", "border-radius": "50%", background: "transparent", color: "inherit", "font-size": "20px", "line-height": "1", cursor: "pointer" }]],
};

function installNewBlockStyles(editor: Editor, component: Component): void {
  for (const className of component.getClasses?.() ?? []) {
    for (const [selector, style] of NEW_BLOCK_STYLES[className] ?? []) if (!editor.Css.getRule(selector)) editor.Css.setRule(selector, style);
  }
}

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
  return <div className="movecues-builder-size"><h3>Size</h3>{widgetType === "banner" ? <><Label>Width<Input value="Full width" disabled /></Label><p>Banner width is locked to its container.</p></> : <><Label>Width mode<select value={size.width.mode} onChange={event => { const mode = event.target.value as "fixed" | "full"; const next = mode === "full" ? { width: { mode: "full" as const }, height: { mode: "viewport" as const } } : { ...size, width: { mode: "fixed" as const, value: typeof constraint.width.default === "number" ? constraint.width.default : constraint.width.min } }; setNotice(""); persist(next); }}><option value="fixed">Fixed</option>{constraint.width.allowFull && <option value="full">Fullscreen</option>}</select></Label>{size.width.mode === "fixed" && <Label>Width<div className="movecues-size-input"><Input aria-label="Widget width" type="number" min={constraint.width.min} max={constraint.width.max} value={width} onChange={event => { setWidth(event.target.value); previewWidth(event.target.value); }} onBlur={commitWidth} /><span>px</span></div></Label>}</>}{constraint.height.allowFixed && <><Label>Height<select value={size.height.mode} onChange={event => { const mode = event.target.value as ExperienceSize["height"]["mode"]; const next = { ...size, height: mode === "fixed" ? { mode, value: constraint.height.min } : { mode } }; setNotice(""); persist(next); }}><option value="auto">Auto</option><option value="fixed">Fixed</option>{constraint.height.allowViewport && <option value="viewport">Viewport safe</option>}</select></Label>{size.height.mode === "fixed" && <Label>Height<div className="movecues-size-input"><Input aria-label="Widget height" type="number" min={constraint.height.min} max={constraint.height.max} value={height} onChange={event => { setHeight(event.target.value); previewHeight(event.target.value); }} onBlur={commitHeight} /><span>px</span></div></Label>}</>}{!constraint.height.allowFixed && widgetType !== "banner" && <Label>Height<Input value="Auto" disabled /></Label>}<p>{notice || (constraint.width.max ? `Allowed width: ${constraint.width.min}–${constraint.width.max}px.` : "")}</p></div>;
}

function builderSizeEnvelopeCss(widgetType: WidgetType, design: ExperienceDesign): string {
  const size = widgetSizeCss(widgetType, design);
  return `body>.movecues-widget{width:${size.width}!important;${size.minWidth ? `min-width:${size.minWidth}!important;` : ""}${size.maxWidth ? `max-width:${size.maxWidth}!important;` : ""}height:${size.height}!important;max-height:${size.maxHeight}!important;overflow:auto!important}`;
}

function widgetLabel(widgetType: WidgetType): string { return widgetType.split("_").map(value => value[0].toUpperCase() + value.slice(1)).join(" "); }

function syncSurveyComponents(editor: Editor, questions: SurveyQuestion[]): void {
  const wrapper = editor.getWrapper(); const root = wrapper?.find(".movecues-widget")[0]; if (!root) return;
  ensureSurveyNavigation(root);
  const wanted = new Map(questions.map(question => [question.id, question]));
  const existing = root.find("[data-movecues-question-id]");
  const seen = new Set<string>();
  for (const component of existing) {
    const id = String(component.getAttributes()["data-movecues-question-id"] ?? "");
    const question = wanted.get(id);
    if (!question || seen.has(id)) { component.remove(); continue; }
    seen.add(id);
    const parsed = new DOMParser().parseFromString(surveyQuestionMarkup(question), "text/html").body.firstElementChild;
    if (!parsed) continue;
    component.set({ removable: false, copyable: false, editable: false });
    component.addClass(["movecues-survey-question", `movecues-survey-question--${question.type}`]);
    component.addAttributes({ "data-movecues-question-id": question.id, "data-movecues-question-type": question.type });
    component.components(parsed.innerHTML);
  }
  const action = root.find("[data-movecues-survey-action]")[0]; const actionContainer = action?.parent();
  const insertionIndex = actionContainer?.parent() === root ? root.components().indexOf(actionContainer) : undefined;
  questions.forEach((question, offset) => { if (!seen.has(question.id)) root.append(surveyQuestionMarkup(question), insertionIndex === undefined ? undefined : { at: insertionIndex + offset }); });
}

function ensureSurveyNavigation(root: Component): void {
  root.set("removable", false); root.set("copyable", false);
  // Legacy designs retain their protected footer. New designs own each normal
  // button independently and must never gain a wrapper or missing controls.
  const controls = root.find("[data-movecues-survey-controls]")[0];
  if (controls) { controls.set("removable", false); controls.set("copyable", false); }
  for (const button of root.find("[data-movecues-survey-action]")) {
    button.set("droppable", false); button.set("editable", true); button.set("removable", true); button.set("copyable", false);
  }
}

function currentEditorDebugSnapshot(editor: Editor | null | undefined, widgetType: WidgetType): Record<string, unknown> | null {
  if (!editor) return null;
  try {
    const selected = editor.getSelected();
    return { widgetType, dirtyCount: editor.getDirtyCount(), selected: selected ? { id: selected.getId?.(), type: selected.get?.("type"), tagName: selected.get?.("tagName") } : null };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}

function debugComponent(component?: Component | null): Record<string, unknown> | null {
  if (!component) return null;
  try {
    return { id: component.getId?.(), type: component.get?.("type"), tagName: component.get?.("tagName"), classes: component.getClasses?.(), attributes: component.getAttributes?.(), style: component.getStyle?.(), removable: component.get?.("removable"), parentId: component.parent?.()?.getId?.() };
  } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
}

function debugCss(css: string): Record<string, number> {
  return { length: css.length, rules: (css.match(/\{/g) ?? []).length };
}

function canonicalStyleSelector(component: Component): string | null {
  if (component.getClasses?.().includes("movecues-widget")) return ".movecues-widget";
  const styleClass = component.getClasses?.().find(name => name.startsWith(STYLE_CLASS_PREFIX));
  return styleClass ? `.movecues-widget .${styleClass}` : null;
}

function ensureCanonicalStyleSelector(component: Component): string {
  const existing = canonicalStyleSelector(component);
  if (existing) return existing;
  styleClassSequence += 1;
  const styleClass = `${STYLE_CLASS_PREFIX}${Date.now().toString(36)}-${styleClassSequence.toString(36)}`;
  component.addClass(styleClass);
  return `.movecues-widget .${styleClass}`;
}

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Component, Editor } from "grapesjs";
import { Code2, Hand, Minus, Monitor, MousePointer2, Plus, Redo2, Smartphone, Tablet, Undo2, X } from "lucide-react";
import "grapesjs/dist/css/grapes.min.css";
import "./GrapesWidgetBuilder.css";
import type { ExperienceAction, ExperienceContent, ExperienceDesign, ExperienceSize, SurveyQuestion, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { builderSignature, createWidgetStarter, projectLegacyContent, sanitizeBuilderHtml, surveyQuestionMarkup, validateBuilderCss, type BuilderExport } from "./widgetBuilder";
import { FREE_AREA_CLASS, installWidgetInteractions, type FreeItemBox, type WidgetInteractionController } from "./grapesWidgetInteractions";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS, widgetSizeCss } from "./widgetSizing";
import { builderDebug, summarizeBuilder } from "./builderDebug";

interface Props {
  experienceKey: string;
  widgetType: WidgetType;
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

export const GrapesWidgetBuilder = forwardRef<GrapesWidgetBuilderHandle, Props>(function GrapesWidgetBuilder({ experienceKey, widgetType, value, content, design, onChange, onPrimaryActionChange, onSizeChange, surveyQuestions }, ref) {
  const canvasViewportRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLDivElement>(null); const blocksRef = useRef<HTMLDivElement>(null); const stylesRef = useRef<HTMLDivElement>(null); const traitsRef = useRef<HTMLDivElement>(null); const editorRef = useRef<Editor | null>(null);
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
  const lastPersistedCssRef = useRef(value?.css ?? "");
  const onChangeRef = useRef(onChange); const onSizeChangeRef = useRef(onSizeChange); const contentRef = useRef(content); const designRef = useRef(design); const lastSignature = useRef(value ? builderSignature(value) : "");
  const [ready, setReady] = useState(false); const [positioned, setPositioned] = useState(false); const [device, setDevice] = useState("Desktop"); const [codeMode, setCodeMode] = useState(false); const [codeHtml, setCodeHtml] = useState(value?.html ?? ""); const [codeCss, setCodeCss] = useState(value?.css ?? ""); const [codeError, setCodeError] = useState<string | null>(null); const [selectedAction, setSelectedAction] = useState<"primary" | "secondary" | null>(null); const [sidebarTab, setSidebarTab] = useState<"blocks" | "properties">("blocks"); const [zoomLabel, setZoomLabel] = useState(100); const [handTool, setHandTool] = useState(false); const [spacePressed, setSpacePressed] = useState(false); const [panning, setPanning] = useState(false); const [freeItemBox, setFreeItemBox] = useState<FreeItemBox | null>(null);
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
    const starter = createWidgetStarter(widgetType, contentRef.current, design);
    lastPersistedCssRef.current = value?.css ?? starter.css;
    // HTML and CSS are the runtime contract shared with the SDK. GrapesJS
    // projectData is still exported for diagnostics/future migrations, but it
    // must not be the reload source: its PageManager can transiently build an
    // unattached component tree (pages: []) and never finish `onReady`.
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
        const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html, css }; const signature = builderSignature(builder);
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
          const restoredBuilder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html, css: restoredCss };
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
      const currentProjectData = editor.getProjectData() as Record<string, unknown>;
      const currentRoot = editor.getWrapper()?.find(".movecues-widget")[0];
      if (!currentRoot) {
        builderDebug(experienceKey, "lifecycle:ready-deferred-missing-root", { source, current: currentEditorDebugSnapshot(editor, widgetType) }, "warn");
        return;
      }
      builderDebug(experienceKey, "lifecycle:ready:start", { source, before: summarizeBuilder({ version: 1, projectData: currentProjectData, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: editorCss() }) }, "info");
      initialized = true; setReady(true);
      applyingCodeRef.current = true;
      const widgetRoot = editor.getWrapper()?.find(".movecues-widget")[0];
      if (widgetRoot) { widgetRoot.set("removable", false); widgetRoot.set("copyable", false); }
      interactionControllerRef.current?.syncFreeAreas();
      editor.clearDirtyCount();
      applyingCodeRef.current = false;
      const html = sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"); const css = editorCss(); setCodeHtml(html); setCodeCss(css);
      builderDebug(experienceKey, "lifecycle:ready:complete", { snapshot: summarizeBuilder({ version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html, css }), html, css }, "info");
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
      const selectAction = (component?: Component) => { const slot = component?.getAttributes()?.["data-movecues-action-id"]; setSelectedAction(slot === "primary" || slot === "secondary" ? slot : null); interactionControllerRef.current?.select(component); selectCanonicalStyleTarget(component); setSidebarTab("properties"); };
      const keepOneActionPerSlot = (component: Component) => { const slot = component.getAttributes()?.["data-movecues-action-id"]; if (slot !== "primary" && slot !== "secondary") return; const matches = editor!.getWrapper()!.find(`[data-movecues-action-id="${slot}"]`); if (matches.length > 1) { component.remove(); editor!.select(matches[0]); } };
      editor.on("update", () => { builderDebug(experienceKey, "grapes:update", { dirtyCount: editor?.getDirtyCount() }); schedule(false, "grapes:update"); });
      editor.on("component:styleUpdate", (component: Component) => { builderDebug(experienceKey, "grapes:component-style-update", { component: debugComponent(component), css: debugCss(rawEditorCss()) }); persistComponentStyle(component); });
      editor.on("style:property:update", () => { builderDebug(experienceKey, "grapes:style-property-update", { selected: debugComponent(editor?.getSelected()), css: debugCss(rawEditorCss()) }); queueMicrotask(() => persistComponentStyle()); });
      editor.on("component:selected", (component: Component) => { builderDebug(experienceKey, "grapes:component-selected", { component: debugComponent(component) }); selectAction(component); });
      editor.on("component:add", (component: Component) => { builderDebug(experienceKey, "grapes:component-add", { component: debugComponent(component), snapshot: currentEditorDebugSnapshot(editor, widgetType) }, "info"); keepOneActionPerSlot(component); });
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
  const applyCode = () => { const editor = editorRef.current; if (!editor) return; builderDebug(experienceKey, "code:apply:start", { htmlLength: codeHtml.length, cssLength: codeCss.length, html: codeHtml, css: codeCss }, "info"); try { const html = sanitizeBuilderHtml(codeHtml, widgetType === "survey"); const css = validateBuilderCss(codeCss); applyingCodeRef.current = true; builderDebug(experienceKey, "code:css-clear", { before: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); editor.setComponents(html); editor.Css.clear(); editor.setStyle(css); interactionControllerRef.current?.syncFreeAreas(); if (widgetType === "survey" && surveyQuestions) syncSurveyComponents(editor, surveyQuestions); if (!interactionControllerRef.current?.isEditing()) editor.clearDirtyCount(); const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? "") }; lastSignature.current = builderSignature(builder); lastPersistedCssRef.current = builder.css; setCodeHtml(builder.html); setCodeCss(builder.css); setCodeError(null); builderDebug(experienceKey, "code:apply:dispatch", { snapshot: summarizeBuilder(builder), html: builder.html, css: builder.css }, "info"); onChangeRef.current({ builder, content: projectLegacyContent(builder.html, contentRef.current) }); scheduleCanvasRefreshRef.current(); } catch (error) { const message = error instanceof Error ? error.message : "The code could not be applied."; builderDebug(experienceKey, "code:apply:error", { message, stack: error instanceof Error ? error.stack : undefined }, "error"); setCodeError(message); } finally { applyingCodeRef.current = false; } };
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
  const updateActionType = (type: ExperienceAction["type"]) => { const label = currentAction?.label ?? "Continue"; onPrimaryActionChange(type === "open_url" ? { label, type, url: currentAction?.url ?? "https://example.com" } : type === "track_event" ? { label, type, eventName: currentAction?.eventName ?? "experience_action" } : { label, type: "dismiss" }); };

  return <div className="movecues-builder-shell">
    <div className="movecues-builder-toolbar"><div className="movecues-builder-toolbar__group">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <Button key={String(name)} type="button" size="sm" variant={device === name ? "default" : "outline"} onClick={() => chooseDevice(String(name))}><Icon className="size-4" />{String(name)}</Button>)}</div><div className="movecues-builder-toolbar__group"><Button type="button" size="icon" variant={!handTool ? "default" : "outline"} aria-label="Select tool" onClick={() => setHandTool(false)}><MousePointer2 /></Button><Button type="button" size="icon" variant={handTool ? "default" : "outline"} aria-label="Hand tool" aria-pressed={handTool} onClick={() => setHandTool(true)}><Hand /></Button><Button type="button" size="icon" variant="outline" aria-label="Zoom out" disabled={zoomLabel <= MIN_CANVAS_ZOOM} onClick={() => zoomBy(-CANVAS_ZOOM_STEP)}><Minus /></Button><output className="movecues-builder-zoom" aria-label="Zoom percentage">{zoomLabel}%</output><Button type="button" size="icon" variant="outline" aria-label="Zoom in" disabled={zoomLabel >= MAX_CANVAS_ZOOM} onClick={() => zoomBy(CANVAS_ZOOM_STEP)}><Plus /></Button><Button type="button" size="sm" variant="outline" onClick={() => scheduleCanvasFitRef.current()}>Fit</Button><Button type="button" size="icon" variant="outline" aria-label="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Clear selection" onClick={() => editorRef.current?.select()}><X /></Button><Button type="button" size="icon" variant={codeMode ? "default" : "outline"} aria-label="Toggle HTML and CSS editor" onClick={toggleCode}><Code2 /></Button></div></div>
    <div className={`movecues-builder-code${codeMode ? "" : " movecues-builder-view--hidden"}`} aria-hidden={!codeMode}><Label>HTML<Textarea aria-label="Builder HTML" value={codeHtml} onChange={event => setCodeHtml(event.target.value)} /></Label><Label>CSS<Textarea aria-label="Builder CSS" value={codeCss} onChange={event => setCodeCss(event.target.value)} /></Label><div className="col-span-full flex items-center gap-3"><Button type="button" onClick={applyCode}>Apply HTML and CSS</Button>{codeError && <p className="m-0 text-sm text-destructive">{codeError}</p>}</div></div>
    {!codeMode && codeError && <div className="movecues-builder-error" role="alert">Builder changes could not be saved: {codeError}</div>}
    <div className={`movecues-builder-workspace${codeMode ? " movecues-builder-view--hidden" : ""}`} aria-hidden={codeMode}><aside className="movecues-builder-panel"><div className="movecues-builder-tabs" role="tablist" aria-label="Builder sidebar"><button type="button" role="tab" id="movecues-builder-blocks-tab" aria-selected={sidebarTab === "blocks"} aria-controls="movecues-builder-blocks-panel" onClick={() => setSidebarTab("blocks")}>Blocks</button><button type="button" role="tab" id="movecues-builder-properties-tab" aria-selected={sidebarTab === "properties"} aria-controls="movecues-builder-properties-panel" onClick={() => setSidebarTab("properties")}>Properties</button></div><div className={`movecues-builder-tab-panel${sidebarTab === "blocks" ? "" : " movecues-builder-tab-panel--hidden"}`} role="tabpanel" id="movecues-builder-blocks-panel" aria-labelledby="movecues-builder-blocks-tab"><p className="movecues-builder-hint">Drag blocks into the canvas, then select an element to customize it.</p><div ref={blocksRef} /></div><div className={`movecues-builder-tab-panel${sidebarTab === "properties" ? "" : " movecues-builder-tab-panel--hidden"}`} role="tabpanel" id="movecues-builder-properties-panel" aria-labelledby="movecues-builder-properties-tab"><WidgetSizeEditor widgetType={widgetType} design={design} onPreview={previewSize} onChange={onSizeChange} />{freeItemBox && <div className="movecues-position-inspector"><h3>Position</h3><div className="movecues-position-grid">{([['x', 'X'], ['y', 'Y'], ['width', 'W'], ['height', 'H']] as const).map(([property, label]) => <Label key={property}>{label}<Input aria-label={`Position ${label}`} type="number" value={Math.round(freeItemBox[property])} onChange={event => updateFreeItem(property, event.target.value)} /></Label>)}</div><div className="movecues-position-actions"><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "forward")}>Bring forward</Button><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "backward")}>Send backward</Button></div></div>}<div ref={traitsRef} /><div ref={stylesRef} />{selectedAction === "primary" && <div className="movecues-action-inspector"><h3>movecues action</h3><Label>Action<select value={currentAction?.type ?? "dismiss"} onChange={event => updateActionType(event.target.value as ExperienceAction["type"])}><option value="dismiss">Dismiss</option><option value="open_url">Open URL</option><option value="track_event">Track event</option></select></Label>{currentAction?.type === "open_url" && <Label>URL<Input type="url" value={currentAction.url ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, url: event.target.value })} /></Label>}{currentAction?.type === "track_event" && <Label>Event name<Input value={currentAction.eventName ?? ""} onChange={event => onPrimaryActionChange({ ...currentAction, eventName: event.target.value })} /></Label>}</div>}{selectedAction === "secondary" && <div className="movecues-action-inspector"><h3>movecues action</h3><p>Secondary buttons use the existing dismiss action.</p></div>}</div></aside><div ref={canvasViewportRef} className={`movecues-builder-canvas${handTool || spacePressed ? " movecues-builder-canvas--pan-ready" : ""}${panning ? " movecues-builder-canvas--panning" : ""}`}><div ref={canvasRef} className="movecues-builder-editor" /><div className={`movecues-builder-pan-layer${handTool || spacePressed || panning ? " movecues-builder-pan-layer--active" : ""}`} aria-hidden="true" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} />{(!ready || !positioned) && <div className="movecues-builder-loading">Loading builder…</div>}</div></div>
  </div>;
});

function clampCanvasZoom(value: number): number {
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, Number.isFinite(value) ? value : 100));
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as { closest?: (selector: string) => Element | null } | null;
  return Boolean(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
}

function blocks() { return [
  { id: "free-area", label: "Free Area", category: "Layout", content: { type: "movecues-free-area", tagName: "div", classes: [FREE_AREA_CLASS] } },
  { id: "container", label: "Container", category: "Layout", content: { type: "default", tagName: "div", classes: ["movecues-widget__container"], components: "Container" } },
  { id: "row", label: "Row", category: "Layout", content: '<div class="movecues-widget__row"><div class="movecues-widget__column">Column</div><div class="movecues-widget__column">Column</div></div>' },
  { id: "columns", label: "Columns", category: "Layout", content: '<div class="movecues-widget__columns"><div class="movecues-widget__column">Left</div><div class="movecues-widget__column">Right</div></div>' },
  { id: "heading", label: "Heading", category: "Content", content: '<h2 class="movecues-widget__heading">Heading</h2>' },
  { id: "text", label: "Text", category: "Content", content: '<p class="movecues-widget__body">Add your message.</p>' },
  { id: "image", label: "Image", category: "Content", content: { type: "image", tagName: "img", attributes: { class: "movecues-widget__image", alt: "" } }, activate: true },
  { id: "icon", label: "Icon", category: "Content", content: '<span class="movecues-widget__icon" role="img" aria-label="Icon">★</span>' },
  { id: "divider", label: "Divider", category: "Content", content: '<hr class="movecues-widget__divider">' },
  { id: "spacer", label: "Spacer", category: "Layout", content: '<div class="movecues-widget__spacer">&nbsp;</div>' },
  { id: "button", label: "Button", category: "Actions", content: '<button class="movecues-widget__button" data-movecues-action-id="primary">Continue</button>' },
  { id: "secondary-button", label: "Secondary button", category: "Actions", content: '<button class="movecues-widget__button movecues-widget__button--secondary" data-movecues-action-id="secondary">Dismiss</button>' },
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
  const configureControls = () => {
    const controls = root.find("[data-movecues-survey-controls]")[0];
    if (controls) { controls.set("removable", false); controls.set("copyable", false); }
    for (const button of root.find("[data-movecues-survey-action]")) {
      button.set("droppable", false); button.set("editable", true); button.set("removable", true); button.set("copyable", false);
    }
  };
  if (root.find("[data-movecues-survey-controls]")[0]) { configureControls(); return; }
  const action = root.find("[data-movecues-survey-action]")[0]; const footer = action?.parent();
  if (footer && footer.parent() === root) {
    footer.addAttributes({ "data-movecues-survey-controls": "builder" });
    if (!root.find('[data-movecues-survey-action="back"]')[0]) footer.append('<button type="button" class="movecues-widget__button movecues-widget__button--secondary" data-movecues-survey-action="back">Back</button>', { at: 1 });
    if (!root.find('[data-movecues-survey-action="next"]')[0]) footer.append('<button type="button" class="movecues-widget__button" data-movecues-survey-action="next">Next</button>');
    if (!root.find('[data-movecues-survey-action="submit"]')[0]) footer.append('<button type="button" class="movecues-widget__button" data-movecues-survey-action="submit">Submit</button>');
    configureControls();
    return;
  }
  root.append('<div class="movecues-survey-footer" data-movecues-survey-controls="builder"><button type="button" class="movecues-widget__button movecues-widget__button--secondary" data-movecues-survey-action="back">Back</button><button type="button" class="movecues-widget__button" data-movecues-survey-action="next">Next</button><button type="button" class="movecues-widget__button" data-movecues-survey-action="submit">Submit</button></div>');
  configureControls();
}

function currentEditorDebugSnapshot(editor: Editor | null | undefined, widgetType: WidgetType): Record<string, unknown> | null {
  if (!editor) return null;
  try {
    const builder: WidgetBuilderState = { version: 1, projectData: editor.getProjectData() as Record<string, unknown>, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? "") };
    return summarizeBuilder(builder);
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

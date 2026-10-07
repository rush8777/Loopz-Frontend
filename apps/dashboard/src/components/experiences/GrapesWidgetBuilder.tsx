import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, type UIEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Block, Component, Editor } from "grapesjs";
import { Badge as BadgeIcon, Box, CircleDot, CircleUserRound, Code2, Columns3, Hand, Heading2, ImagePlus as ImageIcon, List, Maximize2, Minus, Monitor, MousePointer2, MousePointerClick, MoveVertical, Plus, Redo2, Rows3, SquareMousePointer, Star, Smartphone, Tablet, Type, Undo2, X, type LucideIcon } from "lucide-react";
import "grapesjs/dist/css/grapes.min.css";
import "./GrapesWidgetBuilder.css";
import type { BuilderCanvasViewport, ChecklistItem, ExperienceAction, ExperienceContent, ExperienceDesign, ExperienceSize, SurveyQuestion, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { Button } from "@movcues/ui";
import { Input } from "@movcues/ui";
import { Label } from "@movcues/ui";
import { Textarea } from "@movcues/ui";
import { builderSignature, createWidgetStarter, projectLegacyContent, sanitizeBuilderHtml, validateBuilderCss, type BuilderExport } from "./widgetBuilder";
import { FREE_AREA_CLASS, installWidgetInteractions, type FreeItemBox, type WidgetInteractionController } from "./grapesWidgetInteractions";
import { GrapesWidgetInspector, type InspectorStylePatch, type InspectorStyleSnapshot } from "./GrapesWidgetInspector";
import { builderPreviewSizeEnvelopeCss, clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS } from "./widgetSizing";
import { builderDebug, summarizeBuilder } from "./builderDebug";
import { syncSurveyComponents } from "./surveyComponentSync";
import { syncChecklistComponents, validateChecklistBuilderHtml, type ChecklistPresentationCopy } from "./checklistComponentSync";

interface Props {
  experienceKey: string;
  widgetType: WidgetType;
  interactionContext?: "guide" | "widget" | "survey" | "checklist";
  value?: WidgetBuilderState;
  content: ExperienceContent;
  design: ExperienceDesign;
  onChange: (value: BuilderExport) => void;
  onPrimaryActionChange: (action: ExperienceAction | undefined) => void;
  onSizeChange: (size: ExperienceSize) => void;
  surveyQuestions?: SurveyQuestion[];
  onAddSurveyQuestion?: (type: SurveyQuestion["type"], placement?: number) => string | void;
  checklistItems?: ChecklistItem[];
  checklistCopy?: ChecklistPresentationCopy;
  checklistOrder?: "any" | "sequential";
  checklistInspector?: ReactNode;
  onChecklistSelectionChange?: (selection: { type: "root" } | { type: "task"; itemId: string }) => void;
}

export interface GrapesWidgetBuilderHandle { flush: () => void; selectChecklistItem: (itemId: string) => void; selectChecklistRoot: () => void }

export const BUILDER_PREVIEW_DEVICES = [
  { id: "desktop", name: "Desktop", width: "1200px", height: "900px" },
  { id: "tablet", name: "Tablet", width: "768px", height: "1024px", widthMedia: "768px" },
  { id: "mobile", name: "Mobile", width: "390px", height: "844px", widthMedia: "390px" },
] as const;
const MIN_CANVAS_ZOOM = 25;
const MAX_CANVAS_ZOOM = 200;
const CANVAS_ZOOM_STEP = 10;
const STYLE_CLASS_PREFIX = "movcues-style--";
const AUTHORING_CANVAS_DOT_BACKGROUND = "#f8fafc radial-gradient(circle at 1px 1px, rgb(148 163 184 / .38) 1px, transparent 1.1px)";
// Keep the GrapesJS iframe on the same runtime baseline as the SDK Shadow DOM.
// Builder CSS is injected afterwards and remains free to override these defaults.
const SDK_BUTTON_BASELINE_CSS = "button{border:0;border-radius:7px;padding:8px 12px;font:600 13px ui-sans-serif,system-ui,sans-serif;cursor:pointer}";
let styleClassSequence = 0;

interface ViewportState extends BuilderCanvasViewport {}
interface PanGesture { pointerId: number; startX: number; startY: number; panX: number; panY: number }

function savedViewport(value?: BuilderCanvasViewport): ViewportState | null {
  if (!value || ![value.zoom, value.panX, value.panY].every(Number.isFinite)) return null;
  return { zoom: clampCanvasZoom(value.zoom), panX: value.panX, panY: value.panY };
}
type SelectedInteraction =
  | { kind: "primary" }
  | { kind: "secondary" }
  | { kind: "survey"; action: "back" | "next" | "submit" }
  | { kind: "button" }
  | null;

function interactionForComponent(component?: Component): SelectedInteraction {
  const attributes = component?.getAttributes?.() ?? {};
  if (attributes["data-movcues-option-id"]) return null;
  const slot = attributes["data-movcues-action-id"];
  if (slot === "primary" || slot === "secondary") return { kind: slot };
  const surveyAction = attributes["data-movcues-survey-action"];
  if (surveyAction === "back" || surveyAction === "next" || surveyAction === "submit") return { kind: "survey", action: surveyAction };
  if (component?.get?.("tagName") === "button" || component?.getClasses?.().includes("movcues-widget__button")) return { kind: "button" };
  return null;
}

function previewDevice(name: string): { width: number; height: number } {
  const selected = BUILDER_PREVIEW_DEVICES.find(device => device.name === name) ?? BUILDER_PREVIEW_DEVICES[0];
  return { width: Number.parseInt(selected.width, 10), height: Number.parseInt(selected.height, 10) };
}

function checklistSelection(component: Component): { type: "root" } | { type: "task"; itemId: string } | null {
  let current: Component | undefined = component;
  while (current) {
    const attributes = current.getAttributes?.() ?? {};
    const itemId = attributes["data-movcues-checklist-item-id"];
    if (typeof itemId === "string" && itemId) return { type: "task", itemId };
    if (attributes["data-movcues-checklist-role"] === "root") return { type: "root" };
    current = current.parent?.() ?? undefined;
  }
  return null;
}

function applyChecklistPreview(editor: Editor, items: ChecklistItem[], order: "any" | "sequential", progress: "empty" | "progress" | "complete", view: "expanded" | "launcher" | "completion") {
  const documentValue = editor.Canvas.getDocument?.();
  if (!documentValue) return;
  const completeCount = progress === "complete" ? items.length : progress === "progress" ? Math.max(1, Math.floor(items.length / 2)) : 0;
  documentValue.querySelectorAll<HTMLElement>("[data-movcues-checklist-view]").forEach(element => element.classList.toggle("is-active", element.dataset.movcuesChecklistView === view));
  items.forEach((item, index) => {
    const element = Array.from(documentValue.querySelectorAll<HTMLElement>("[data-movcues-checklist-item-id]")).find(candidate => candidate.dataset.movcuesChecklistItemId === item.id);
    if (element) element.dataset.state = index < completeCount ? "completed" : order === "sequential" && index > completeCount ? "locked" : "available";
  });
  const progressElement = documentValue.querySelector<HTMLElement>('[data-movcues-checklist-role="progress"]');
  if (progressElement) progressElement.textContent = `${completeCount} of ${items.length} complete`;
  const remaining = documentValue.querySelector<HTMLElement>('[data-movcues-checklist-role="remaining-count"]');
  if (remaining) remaining.textContent = String(Math.max(0, items.length - completeCount));
}

export const GrapesWidgetBuilder = forwardRef<GrapesWidgetBuilderHandle, Props>(function GrapesWidgetBuilder({ experienceKey, widgetType, interactionContext = widgetType === "survey" ? "survey" : "widget", value, content, design, onChange, onPrimaryActionChange, onSizeChange, surveyQuestions, onAddSurveyQuestion, checklistItems, checklistCopy, checklistOrder = "any", checklistInspector, onChecklistSelectionChange }, ref) {
  const checklistMode = interactionContext === "checklist";
  const canvasViewportRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLDivElement>(null); const blocksRef = useRef<HTMLDivElement>(null); const stylesRef = useRef<HTMLDivElement>(null); const traitsRef = useRef<HTMLDivElement>(null); const editorRef = useRef<Editor | null>(null);
  const htmlHighlightRef = useRef<HTMLPreElement>(null); const cssHighlightRef = useRef<HTMLPreElement>(null);
  const applyingCodeRef = useRef(false);
  const flushExportRef = useRef<() => void>(() => void 0);
  const fitCanvasRef = useRef<(persist?: boolean) => void>(() => void 0);
  const scheduleCanvasFitRef = useRef<() => void>(() => void 0);
  const scheduleCanvasRefreshRef = useRef<() => void>(() => void 0);
  const applyViewportRef = useRef<(next?: Partial<ViewportState>, updateLabel?: boolean, persist?: boolean) => void>(() => void 0);
  const applySizeEnvelopeRef = useRef<(next: ExperienceDesign) => void>(() => void 0);
  const applyInspectorStyleRef = useRef<(component: Component, patch: InspectorStylePatch) => void>(() => void 0);
  const viewportRef = useRef<ViewportState>({ zoom: 100, panX: 0, panY: 0 });
  const persistedViewportRef = useRef<ViewportState>({ zoom: 100, panX: 0, panY: 0 });
  const viewportPersistedRef = useRef(Boolean(value?.canvas));
  const panGestureRef = useRef<PanGesture | null>(null);
  const spacePressedRef = useRef(false);
  const handToolRef = useRef(false);
  const codeModeRef = useRef(false);
  const interactionControllerRef = useRef<WidgetInteractionController | null>(null);
  const selectedFreeItemRef = useRef<Component | null>(null);
  const surveyProjectionSignatureRef = useRef("");
  const pendingSurveySelectionRef = useRef<string | null>(null);
  const checklistProjectionSignatureRef = useRef("");
  const editorExperienceKeyRef = useRef<string | null>(null);
  const projectDataRef = useRef<Record<string, unknown>>(value?.projectData ?? {});
  const lastPersistedCssRef = useRef(value?.css ?? "");
  const onChangeRef = useRef(onChange); const onSizeChangeRef = useRef(onSizeChange); const addSurveyQuestionRef = useRef(onAddSurveyQuestion); const checklistSelectionRef = useRef(onChecklistSelectionChange); const contentRef = useRef(content); const designRef = useRef(design); const lastSignature = useRef(value ? builderSignature(value) : "");
  const [ready, setReady] = useState(false); const [positioned, setPositioned] = useState(false); const [device, setDevice] = useState("Desktop"); const [codeMode, setCodeMode] = useState(false); const [codeHtml, setCodeHtml] = useState(value?.html ?? ""); const [codeCss, setCodeCss] = useState(value?.css ?? ""); const [codeError, setCodeError] = useState<string | null>(null); const [selectedComponent, setSelectedComponent] = useState<Component | null>(null); const [selectedInteraction, setSelectedInteraction] = useState<SelectedInteraction>(null); const [styleRevision, setStyleRevision] = useState(0); const [sidebarTab, setSidebarTab] = useState<"blocks" | "properties">(checklistMode ? "properties" : "blocks"); const [zoomLabel, setZoomLabel] = useState(100); const [handTool, setHandTool] = useState(false); const [spacePressed, setSpacePressed] = useState(false); const [panning, setPanning] = useState(false); const [freeItemBox, setFreeItemBox] = useState<FreeItemBox | null>(null); const [checklistPreviewProgress, setChecklistPreviewProgress] = useState<"empty" | "progress" | "complete">("empty"); const [checklistPreviewView, setChecklistPreviewView] = useState<"expanded" | "launcher" | "completion">("expanded");
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]); useEffect(() => { onSizeChangeRef.current = onSizeChange; }, [onSizeChange]); useEffect(() => { addSurveyQuestionRef.current = onAddSurveyQuestion; }, [onAddSurveyQuestion]); useEffect(() => { checklistSelectionRef.current = onChecklistSelectionChange; }, [onChecklistSelectionChange]); useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { designRef.current = design; applySizeEnvelopeRef.current(design); }, [design]);
  useEffect(() => { codeModeRef.current = codeMode; }, [codeMode]);
  useEffect(() => { handToolRef.current = handTool; }, [handTool]);
  useImperativeHandle(ref, () => ({ flush: () => flushExportRef.current(), selectChecklistItem: itemId => { const component = editorRef.current?.getWrapper()?.find(`[data-movcues-checklist-item-id="${itemId.replace(/["\\]/g, "\\$&")}"]`)[0]; if (component) editorRef.current?.select(component); }, selectChecklistRoot: () => { const component = editorRef.current?.getWrapper()?.find('[data-movcues-checklist-role="root"]')[0]; if (component) editorRef.current?.select(component); } }), []);
  useEffect(() => { if (widgetType !== "survey" || !ready || !editorRef.current || editorExperienceKeyRef.current !== experienceKey || !surveyQuestions) return; const signature = `${experienceKey}:${JSON.stringify(surveyQuestions)}`; if (signature === surveyProjectionSignatureRef.current) return; builderDebug(experienceKey, "survey:projection:start", { questionCount: surveyQuestions.length, signature }); surveyProjectionSignatureRef.current = signature; syncSurveyComponents(editorRef.current, surveyQuestions); const pendingSelection = pendingSurveySelectionRef.current; if (pendingSelection) { const component = editorRef.current.getWrapper()?.find(`[data-movcues-question-id="${cssAttributeEscape(pendingSelection)}"]`)[0]; if (component) { pendingSurveySelectionRef.current = null; editorRef.current.select(component); } } flushExportRef.current(); builderDebug(experienceKey, "survey:projection:complete"); }, [experienceKey, ready, surveyQuestions, widgetType]);
  useEffect(() => { if (!checklistMode || !ready || !editorRef.current || editorExperienceKeyRef.current !== experienceKey || !checklistItems) return; const signature = `${experienceKey}:${JSON.stringify({ items: checklistItems, copy: checklistCopy })}`; if (signature !== checklistProjectionSignatureRef.current) { checklistProjectionSignatureRef.current = signature; syncChecklistComponents(editorRef.current, checklistItems, checklistCopy); flushExportRef.current(); } applyChecklistPreview(editorRef.current, checklistItems, checklistOrder, checklistPreviewProgress, checklistPreviewView); }, [checklistCopy, checklistItems, checklistMode, checklistOrder, checklistPreviewProgress, checklistPreviewView, experienceKey, ready]);

  useEffect(() => {
    let cancelled = false; let timer = 0; let initializationTimer = 0; let fitFrame = 0; let refreshFrame = 0; let editor: Editor | null = null; let initialized = false; let migratingComponentStyle = false; let resizeObserver: ResizeObserver | null = null; let canvasNavigationBound = false; let canvasViewportElement: HTMLDivElement | null = null;
    editorExperienceKeyRef.current = experienceKey; setReady(false); setPositioned(false); handToolRef.current = false;
    const restoredViewport = savedViewport(value?.canvas);
    viewportPersistedRef.current = Boolean(restoredViewport);
    viewportRef.current = restoredViewport ?? { zoom: 100, panX: 0, panY: 0 }; persistedViewportRef.current = { ...viewportRef.current }; setZoomLabel(viewportRef.current.zoom); setHandTool(false); setSpacePressed(false); setPanning(false); setSelectedComponent(null); setSelectedInteraction(null); setStyleRevision(0); setFreeItemBox(null); spacePressedRef.current = false; panGestureRef.current = null; selectedFreeItemRef.current = null;
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
        const builder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html, css, ...(viewportPersistedRef.current ? { canvas: { ...persistedViewportRef.current } } : {}) }; const signature = builderSignature(builder);
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
          const restoredBuilder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html, css: restoredCss, ...(viewportPersistedRef.current ? { canvas: { ...persistedViewportRef.current } } : {}) };
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
        fitFrame = window.requestAnimationFrame(() => fitCanvasRef.current(false));
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
    applyInspectorStyleRef.current = (component, patch) => {
      if (!editor || cancelled || applyingCodeRef.current || !initialized) return;
      const selector = ensureCanonicalStyleSelector(component);
      const previous = editor.Css.getRule(selector)?.getStyle() ?? {};
      const next = { ...previous } as Record<string, string>;
      for (const [property, value] of Object.entries(patch)) {
        if (value === null || value === "") delete next[property];
        else next[property] = value;
      }
      const rule = editor.Css.setRule(selector, next);
      editor.StyleManager.select(rule, { component });
      setStyleRevision(value => value + 1);
      schedule(true, "inspector:style");
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
      const currentRoot = editor.getWrapper()?.find(".movcues-widget")[0];
      if (!currentRoot) {
        builderDebug(experienceKey, "lifecycle:ready-deferred-missing-root", { source, current: currentEditorDebugSnapshot(editor, widgetType) }, "warn");
        return;
      }
      builderDebug(experienceKey, "lifecycle:ready:start", { source, before: summarizeBuilder({ version: 1, projectData: projectDataRef.current, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: editorCss(), canvas: { ...viewportRef.current } }) }, "info");
      initialized = true; setReady(true);
      applyingCodeRef.current = true;
      const widgetRoot = editor.getWrapper()?.find(".movcues-widget")[0];
      if (widgetRoot) { widgetRoot.set("removable", false); widgetRoot.set("copyable", false); }
      interactionControllerRef.current?.syncFreeAreas();
      editor.clearDirtyCount();
      applyingCodeRef.current = false;
      const html = sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"); const css = editorCss(); setCodeHtml(html); setCodeCss(css);
      builderDebug(experienceKey, "lifecycle:ready:complete", { snapshot: summarizeBuilder({ version: 1, projectData: projectDataRef.current, html, css, canvas: { ...viewportRef.current } }), html, css }, "info");
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
      if (restoredViewport) { applyViewportRef.current(restoredViewport, true, false); setPositioned(true); }
      else scheduleCanvasFit();
    };
    void import("grapesjs").then(module => {
      if (cancelled || !canvasRef.current || !blocksRef.current || !stylesRef.current || !traitsRef.current) return;
      const grapesjs = module.default;
      const envelopeCss = builderPreviewSizeEnvelopeCss(widgetType, designRef.current);
      editor = grapesjs.init({
        container: canvasRef.current, height: "100%", width: "auto", storageManager: false, panels: { defaults: [] }, parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } }, canvasCss: `html{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;padding:1px 0;background:${AUTHORING_CANVAS_DOT_BACKGROUND};background-size:16px 16px}body{box-sizing:border-box;min-width:0;min-height:0;margin:95px auto 160px;padding:0;background:transparent}*{box-sizing:border-box}${SDK_BUTTON_BASELINE_CSS}${envelopeCss}`,
        selectorManager: { componentFirst: true },
        components: initialHtml,
        style: initialCss,
        deviceManager: { devices: BUILDER_PREVIEW_DEVICES.map(item => ({ ...item })) },
        blockManager: { appendTo: blocksRef.current, blocks: checklistMode ? [] : blocks(interactionContext) },
        traitManager: { appendTo: traitsRef.current },
        styleManager: { appendTo: stylesRef.current, sectors: styleSectors() },
        plugins: [instance => {
          instance.DomComponents.addType("movcues-checklist-root", { isComponent: element => element.getAttribute?.("data-movcues-checklist-role") === "root" ? { type: "movcues-checklist-root" } : false, model: { defaults: { tagName: "section", removable: false, copyable: false, draggable: false, droppable: false, editable: false } } });
          instance.DomComponents.addType("movcues-checklist-item", { isComponent: element => element.hasAttribute?.("data-movcues-checklist-item-id") ? { type: "movcues-checklist-item" } : false, model: { defaults: { removable: false, copyable: false, draggable: false, droppable: false, editable: false } } });
          instance.DomComponents.addType("movcues-checklist-structure", { isComponent: element => checklistMode && (element.hasAttribute?.("data-movcues-checklist-role") || element.hasAttribute?.("data-movcues-checklist-view") || element.hasAttribute?.("data-movcues-checklist-item-role")) ? { type: "movcues-checklist-structure" } : false, model: { defaults: { removable: false, copyable: false, draggable: false, droppable: false, editable: false } } });
          instance.DomComponents.addType("movcues-widget-root", { isComponent: element => element.classList?.contains("movcues-widget") ? { type: "movcues-widget-root" } : false, model: { defaults: { tagName: "section", removable: false, copyable: false } } });
          instance.DomComponents.addType("movcues-survey-controls", { isComponent: element => element.hasAttribute?.("data-movcues-survey-controls") ? { type: "movcues-survey-controls" } : false, model: { defaults: { tagName: "div", removable: false, copyable: false } } });
          instance.DomComponents.addType("movcues-survey-question", { isComponent: element => element.hasAttribute?.("data-movcues-question-id") ? { type: "movcues-survey-question" } : false, model: { defaults: { droppable: true, editable: false, removable: false, copyable: false, traits: [] } } });
          instance.DomComponents.addType("movcues-survey-question-gateway", { isComponent: element => element.hasAttribute?.("data-movcues-survey-question-gateway") ? { type: "movcues-survey-question-gateway" } : false, model: { defaults: { tagName: "div", droppable: false, editable: false, removable: false, copyable: false, traits: [] } } });
          instance.DomComponents.addType("movcues-button", { isComponent: element => element.tagName === "BUTTON" && (element.hasAttribute?.("data-movcues-action-id") || element.hasAttribute?.("data-movcues-survey-action")) ? { type: "movcues-button" } : false, model: { defaults: { tagName: "button", droppable: false, editable: true, removable: true, copyable: false, traits: [] } } });
          instance.DomComponents.addType("movcues-free-area", { isComponent: element => element.classList?.contains(FREE_AREA_CLASS) ? { type: "movcues-free-area" } : false, model: { defaults: { tagName: "div", classes: [FREE_AREA_CLASS], droppable: true } } });
          instance.DomComponents.addType("movcues-avatar-image", { isComponent: element => element.tagName === "IMG" && element.classList?.contains("movcues-widget__avatar-image") ? { type: "movcues-avatar-image" } : false, model: { defaults: { tagName: "img", droppable: false, traits: [{ type: "text", name: "src", label: "Image URL" }, { type: "text", name: "alt", label: "Alt text" }] } } });
        }, instance => { if (!checklistMode) interactionControllerRef.current = installWidgetInteractions(instance, { widgetType, design: () => designRef.current, onRootResize: (size, commit) => { const next = { ...designRef.current, size }; applySizeEnvelopeRef.current(next); if (commit) { designRef.current = next; onSizeChangeRef.current(size); } }, onFreeItemChange: (component, box) => { selectedFreeItemRef.current = component; setFreeItemBox(box); }, onMutation: scheduleCustomMutation, canStartFreeDrag: target => !handToolRef.current && !spacePressedRef.current && !codeModeRef.current && !isEditableTarget(target) }); }],
      });
      if (cancelled) { editor.destroy(); return; }
      editorRef.current = editor;
      applyViewportRef.current = (next = {}, updateLabel = true, persist = false) => {
        if (!editor || cancelled) return;
        const previous = viewportRef.current;
        const viewport = { zoom: clampCanvasZoom(next.zoom ?? previous.zoom), panX: next.panX ?? previous.panX, panY: next.panY ?? previous.panY };
        viewportRef.current = viewport;
        editor.Canvas.setZoom(viewport.zoom);
        editor.Canvas.setCoords(viewport.panX, viewport.panY);
        if (updateLabel) setZoomLabel(Math.round(viewport.zoom));
        if (persist) { viewportPersistedRef.current = true; persistedViewportRef.current = { ...viewport }; schedule(true, "canvas:viewport"); }
      };
      applySizeEnvelopeRef.current = next => {
        if (!editor || cancelled) return;
        const documentValue = editor.Canvas.getDocument();
        if (!documentValue) return;
        let style = documentValue.head.querySelector<HTMLStyleElement>("style[data-movcues-size-envelope]");
        if (!style) { style = documentValue.createElement("style"); style.dataset.movcuesSizeEnvelope = ""; documentValue.head.appendChild(style); }
        style.textContent = builderPreviewSizeEnvelopeCss(widgetType, next);
      };
      fitCanvasRef.current = (persist = true) => {
        if (!editor || cancelled || !canvasRef.current) return;
        const activeDevice = previewDevice(editor.getDevice());
        const frame = editor.Canvas.getFrameEl();
        const frameWidth = frame?.offsetWidth || activeDevice.width;
        const frameHeight = frame?.offsetHeight || activeDevice.height;
        const availableWidth = canvasRef.current.clientWidth - 40;
        const availableHeight = canvasRef.current.clientHeight - 40;
        if (availableWidth <= 0 || availableHeight <= 0) { setPositioned(true); return; }
        const zoom = Math.max(MIN_CANVAS_ZOOM / 100, Math.min(1, availableWidth / frameWidth, availableHeight / frameHeight));
        applyViewportRef.current({ zoom: zoom * 100, panX: (canvasRef.current.clientWidth - frameWidth * zoom) / 2, panY: (canvasRef.current.clientHeight - frameHeight * zoom) / 2 }, true, persist);
        setPositioned(true);
      };
      if (typeof ResizeObserver !== "undefined" && canvasRef.current) {
        resizeObserver = new ResizeObserver(scheduleCanvasRefresh);
        resizeObserver.observe(canvasRef.current);
      }
      applySizeEnvelopeRef.current(designRef.current);
      const selectAction = (component?: Component) => { setSelectedComponent(component ?? null); setSelectedInteraction(interactionForComponent(component)); interactionControllerRef.current?.select(component); selectCanonicalStyleTarget(component); setStyleRevision(value => value + 1); setSidebarTab("properties"); if (checklistMode && component) { const selection = checklistSelection(component); if (selection) checklistSelectionRef.current?.(selection); } };
      const keepOneActionPerSlot = (component: Component) => { if (widgetType === "survey") return; const slot = component.getAttributes()?.["data-movcues-action-id"]; if (slot !== "primary" && slot !== "secondary") return; const matches = editor!.getWrapper()!.find(`[data-movcues-action-id="${slot}"]`); if (matches.length > 1) { component.remove(); editor!.select(matches[0]); } };
      editor.on("update", () => { builderDebug(experienceKey, "grapes:update", { dirtyCount: editor?.getDirtyCount() }); schedule(false, "grapes:update"); });
      editor.on("component:styleUpdate", (component: Component) => { builderDebug(experienceKey, "grapes:component-style-update", { component: debugComponent(component), css: debugCss(rawEditorCss()) }); persistComponentStyle(component); setStyleRevision(value => value + 1); });
      editor.on("style:property:update", () => { builderDebug(experienceKey, "grapes:style-property-update", { selected: debugComponent(editor?.getSelected()), css: debugCss(rawEditorCss()) }); queueMicrotask(() => { persistComponentStyle(); setStyleRevision(value => value + 1); }); });
      editor.on("component:selected", (component: Component) => { builderDebug(experienceKey, "grapes:component-selected", { component: debugComponent(component) }); selectAction(component); });
      editor.on("undo", () => setStyleRevision(value => value + 1));
      editor.on("redo", () => setStyleRevision(value => value + 1));
      editor.on("component:add", (component: Component) => { builderDebug(experienceKey, "grapes:component-add", { component: debugComponent(component), snapshot: currentEditorDebugSnapshot(editor, widgetType) }, "info"); keepOneActionPerSlot(component); if (!applyingCodeRef.current) installNewBlockStyles(editor!, component); });
      editor.on("component:remove", (component: Component) => { builderDebug(experienceKey, "grapes:component-remove", { component: debugComponent(component), snapshot: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); });
      editor.on("block:drag:stop", (component: Component | undefined, block: Block) => {
        const type = surveyQuestionTypeForBlock(block) ?? surveyQuestionTypeForGateway(component);
        if (!component || !type) return;
        const root = editor!.getWrapper()?.find(".movcues-widget")[0];
        const placement = root ? surveyGatewayPlacement(root, component) : undefined;
        applyingCodeRef.current = true;
        try { component.remove(); } finally { applyingCodeRef.current = false; }
        const questionId = addSurveyQuestionRef.current?.(type, placement);
        if (questionId) pendingSurveySelectionRef.current = questionId;
      });
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
      flushExportRef.current = () => void 0; fitCanvasRef.current = () => void 0; scheduleCanvasFitRef.current = () => void 0; scheduleCanvasRefreshRef.current = () => void 0; applyViewportRef.current = () => void 0; applySizeEnvelopeRef.current = () => void 0; applyInspectorStyleRef.current = () => void 0; interactionControllerRef.current?.destroy(); interactionControllerRef.current = null; selectedFreeItemRef.current = null; editorRef.current = null; if (editorExperienceKeyRef.current === experienceKey) editorExperienceKeyRef.current = null; editor?.destroy();
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
  const applyCode = () => { const editor = editorRef.current; if (!editor) return; builderDebug(experienceKey, "code:apply:start", { htmlLength: codeHtml.length, cssLength: codeCss.length, html: codeHtml, css: codeCss }, "info"); try { const html = sanitizeBuilderHtml(codeHtml, widgetType === "survey"); const css = validateBuilderCss(codeCss); if (checklistMode) validateChecklistBuilderHtml(html, checklistItems ?? []); applyingCodeRef.current = true; builderDebug(experienceKey, "code:css-clear", { before: currentEditorDebugSnapshot(editor, widgetType) }, "warn"); editor.setComponents(html); editor.Css.clear(); editor.setStyle(css); interactionControllerRef.current?.syncFreeAreas(); if (widgetType === "survey" && surveyQuestions) syncSurveyComponents(editor, surveyQuestions); if (checklistMode && checklistItems) syncChecklistComponents(editor, checklistItems, checklistCopy); if (!interactionControllerRef.current?.isEditing()) editor.clearDirtyCount(); const builder: WidgetBuilderState = { version: 1, projectData: projectDataRef.current, html: sanitizeBuilderHtml(editor.getHtml(), widgetType === "survey"), css: validateBuilderCss(editor.getCss({ avoidProtected: true }) ?? ""), ...(viewportPersistedRef.current ? { canvas: { ...persistedViewportRef.current } } : {}) }; lastSignature.current = builderSignature(builder); lastPersistedCssRef.current = builder.css; setCodeHtml(builder.html); setCodeCss(builder.css); setCodeError(null); builderDebug(experienceKey, "code:apply:dispatch", { snapshot: summarizeBuilder(builder), html: builder.html, css: builder.css }, "info"); onChangeRef.current({ builder, content: projectLegacyContent(builder.html, contentRef.current) }); scheduleCanvasRefreshRef.current(); } catch (error) { const message = error instanceof Error ? error.message : "The code could not be applied."; builderDebug(experienceKey, "code:apply:error", { message, stack: error instanceof Error ? error.stack : undefined }, "error"); setCodeError(message); } finally { applyingCodeRef.current = false; } };
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
    applyViewportRef.current({ zoom: nextZoom, panX: pointerX - (pointerX - current.panX) * ratio, panY: pointerY - (pointerY - current.panY) * ratio }, true, true);
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
    applyViewportRef.current({ panX: gesture.panX + event.clientX - gesture.startX, panY: gesture.panY + event.clientY - gesture.startY }, false, true);
  };
  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panGestureRef.current?.pointerId !== event.pointerId) return;
    panGestureRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); setPanning(false); flushExportRef.current();
  };
  const currentAction = content.primaryAction;
  const displayedActionType: ExperienceAction["type"] = interactionContext === "guide" ? "next_step" : currentAction?.type === "open_url" || currentAction?.type === "track_event" ? currentAction.type : "dismiss";
  const updateActionType = (type: ExperienceAction["type"]) => { const label = currentAction?.label ?? "Continue"; onPrimaryActionChange(type === "open_url" ? { label, type, url: currentAction?.url ?? "https://example.com" } : type === "track_event" ? { label, type, eventName: currentAction?.eventName ?? "experience_action" } : type === "next_step" ? { label, type } : { label, type: "dismiss" }); };
  const selectedSurveyAction = selectedInteraction?.kind === "survey" ? selectedInteraction.action : selectedInteraction?.kind === "primary" || selectedInteraction?.kind === "secondary" ? "dismiss" : "";
  const updateSurveyAction = (value: "" | "dismiss" | "back" | "next" | "submit") => {
    const component = editorRef.current?.getSelected();
    if (!component) return;
    const attributes = { ...component.getAttributes() };
    delete attributes["data-movcues-action-id"];
    delete attributes["data-movcues-survey-action"];
    if (value === "dismiss") attributes["data-movcues-action-id"] = component.getClasses?.().includes("movcues-widget__button--secondary") ? "secondary" : "primary";
    if (value === "back" || value === "next" || value === "submit") attributes["data-movcues-survey-action"] = value;
    component.setAttributes(attributes);
    setSelectedInteraction(interactionForComponent(component));
  };
  const interactionInspector = selectedInteraction && <div className="movcues-action-inspector"><h3>Interaction</h3>{interactionContext === "survey" ? <Label>On click<select value={selectedSurveyAction} onChange={event => updateSurveyAction(event.target.value as "" | "dismiss" | "back" | "next" | "submit")}><option value="">No action</option><optgroup label="General"><option value="dismiss">Dismiss experience</option></optgroup><optgroup label="Survey"><option value="back">Survey: Back</option><option value="next">Survey: Next</option><option value="submit">Survey: Submit</option></optgroup></select></Label> : selectedInteraction.kind === "primary" ? <Label>On click<select value={displayedActionType} onChange={event => updateActionType(event.target.value as ExperienceAction["type"])}>{interactionContext === "guide" ? <option value="next_step">Next step</option> : <><option value="dismiss">Dismiss experience</option><option value="open_url">Open URL</option><option value="track_event">Track event</option></>}</select></Label> : selectedInteraction.kind === "secondary" ? <><p className="movcues-action-inspector__label">On click</p><p>Dismiss experience</p></> : null}{interactionContext !== "survey" && selectedInteraction.kind === "primary" && displayedActionType === "open_url" && <Label>URL<Input type="url" value={currentAction?.type === "open_url" ? currentAction.url ?? "" : ""} onChange={event => onPrimaryActionChange({ label: currentAction?.label ?? "Continue", type: "open_url", url: event.target.value })} /></Label>}{interactionContext !== "survey" && selectedInteraction.kind === "primary" && displayedActionType === "track_event" && <Label>Event name<Input value={currentAction?.type === "track_event" ? currentAction.eventName ?? "" : ""} onChange={event => onPrimaryActionChange({ label: currentAction?.label ?? "Continue", type: "track_event", eventName: event.target.value })} /></Label>}</div>;
  const readInspectorStyle = (component: Component): InspectorStyleSnapshot => {
    const editor = editorRef.current;
    const selector = canonicalStyleSelector(component);
    const ruleStyle = selector && editor ? editor.Css.getRule(selector)?.getStyle() ?? {} : {};
    const componentStyle = component.getStyle?.() ?? {};
    const authored = Object.fromEntries(Object.entries({ ...ruleStyle, ...componentStyle }).map(([property, value]) => [property, String(value)]));
    const element = component.getEl?.();
    const computed = element?.ownerDocument?.defaultView?.getComputedStyle?.(element);
    const properties = ["display", "flex-direction", "justify-content", "align-items", "gap", "width", "height", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-left", "margin-right", "font-family", "font-size", "font-weight", "line-height", "text-align", "color", "background-color", "border", "border-radius", "box-shadow", "object-fit"];
    const effective = Object.fromEntries(properties.map(property => [property, computed?.getPropertyValue(property)?.trim() ?? ""]));
    return { authored, effective };
  };
  const freePositionInspector = freeItemBox && <div className="movcues-position-inspector"><h3>Position</h3><div className="movcues-position-grid">{([['x', 'X'], ['y', 'Y'], ['width', 'W'], ['height', 'H']] as const).map(([property, label]) => <Label key={property}>{label}<Input aria-label={`Position ${label}`} type="number" value={Math.round(freeItemBox[property])} onChange={event => updateFreeItem(property, event.target.value)} /></Label>)}</div><div className="movcues-position-actions"><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "forward")}>Bring forward</Button><Button type="button" size="sm" variant="outline" onClick={() => selectedFreeItemRef.current && interactionControllerRef.current?.moveLayer(selectedFreeItemRef.current, "backward")}>Send backward</Button></div></div>;
  const widgetSizeInspector = checklistMode ? undefined : <WidgetSizeEditor widgetType={widgetType} design={design} onPreview={previewSize} onChange={onSizeChange} />;

  return <div className={`movcues-builder-shell${checklistMode ? " movcues-builder-shell--checklist" : ""}`}>
    {checklistMode && <div className="movcues-builder-preview-controls"><Label>Progress<select aria-label="Preview progress" value={checklistPreviewProgress} onChange={event => setChecklistPreviewProgress(event.target.value as typeof checklistPreviewProgress)}><option value="empty">Empty</option><option value="progress">In progress</option><option value="complete">Complete</option></select></Label><Label>View<select aria-label="Preview view" value={checklistPreviewView} onChange={event => setChecklistPreviewView(event.target.value as typeof checklistPreviewView)}><option value="expanded">Expanded</option><option value="launcher">Collapsed</option><option value="completion">Completion</option></select></Label></div>}
    <div className="movcues-builder-toolbar"><div className="movcues-builder-toolbar__group movcues-builder-toolbar__devices movcues-builder-device-switcher" role="group" aria-label="Preview device">{[["Desktop", Monitor], ["Tablet", Tablet], ["Mobile", Smartphone]].map(([name, Icon]) => <Button key={String(name)} type="button" size="icon" variant="ghost" className={device === name ? "movcues-builder-device-switcher__button movcues-builder-device-switcher__button--active" : "movcues-builder-device-switcher__button"} aria-label={String(name)} aria-pressed={device === name} onClick={() => chooseDevice(String(name))}><Icon className="size-4" /></Button>)}</div><div className="movcues-builder-toolbar__group movcues-builder-toolbar__controls">{!codeMode && <div className="movcues-builder-toolbar__cluster"><Button type="button" size="icon" variant="outline" aria-label="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 /></Button><Button type="button" size="icon" variant="outline" aria-label="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 /></Button></div>}<div className="movcues-builder-toolbar__cluster"><Button type="button" size="icon" variant={!handTool ? "default" : "outline"} aria-label="Select tool" onClick={() => setHandTool(false)}><MousePointer2 /></Button><Button type="button" size="icon" variant={handTool ? "default" : "outline"} aria-label="Hand tool" aria-pressed={handTool} onClick={() => setHandTool(true)}><Hand /></Button></div><div className="movcues-builder-toolbar__cluster"><Button type="button" size="icon" variant={codeMode ? "default" : "outline"} aria-label="Toggle HTML and CSS editor" onClick={toggleCode}><Code2 /></Button></div></div></div>
    <div className={`movcues-builder-code${codeMode ? "" : " movcues-builder-view--hidden"}`} aria-hidden={!codeMode}><Label>HTML<div className="movcues-builder-code__editor"><pre ref={htmlHighlightRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightHtml(codeHtml) }} /><Textarea className="movcues-builder-code__input" aria-label="Builder HTML" spellCheck={false} value={codeHtml} onChange={event => setCodeHtml(event.target.value)} onScroll={event => syncCodeScroll(event, htmlHighlightRef)} /></div></Label><Label>CSS<div className="movcues-builder-code__editor"><pre ref={cssHighlightRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightCss(codeCss) }} /><Textarea className="movcues-builder-code__input" aria-label="Builder CSS" spellCheck={false} value={codeCss} onChange={event => setCodeCss(event.target.value)} onScroll={event => syncCodeScroll(event, cssHighlightRef)} /></div></Label><div className="col-span-full flex items-center gap-3"><Button type="button" variant="outline" onClick={formatCode}>Format HTML and CSS</Button><Button type="button" onClick={applyCode}>Apply HTML and CSS</Button>{codeError && <p className="m-0 text-sm text-destructive">{codeError}</p>}</div></div>
    {!codeMode && codeError && <div className="movcues-builder-error" role="alert">Builder changes could not be saved: {codeError}</div>}
    <div className={`movcues-builder-workspace${codeMode ? " movcues-builder-view--hidden" : ""}`} aria-hidden={codeMode}>
      <aside className="movcues-builder-panel">
        <div className="movcues-builder-tabs" role="tablist" aria-label={checklistMode ? "Checklist editor panel" : "Builder sidebar"}>
          {checklistMode ? <>
            <button type="button" role="tab" id="movcues-builder-design-tab" aria-selected={sidebarTab === "properties"} aria-controls="movcues-builder-properties-panel" onClick={() => setSidebarTab("properties")}>Design</button>
            <button type="button" role="tab" id="movcues-builder-checklist-tab" aria-selected={sidebarTab === "blocks"} aria-controls="movcues-builder-blocks-panel" onClick={() => setSidebarTab("blocks")}>Checklist</button>
          </> : <>
            <button type="button" role="tab" id="movcues-builder-blocks-tab" aria-selected={sidebarTab === "blocks"} aria-controls="movcues-builder-blocks-panel" onClick={() => setSidebarTab("blocks")}>Blocks</button>
            <button type="button" role="tab" id="movcues-builder-properties-tab" aria-selected={sidebarTab === "properties"} aria-controls="movcues-builder-properties-panel" onClick={() => setSidebarTab("properties")}>Properties</button>
          </>}
        </div>
        <div className={`movcues-builder-tab-panel${sidebarTab === "blocks" ? "" : " movcues-builder-tab-panel--hidden"}`} role="tabpanel" id="movcues-builder-blocks-panel" aria-labelledby={checklistMode ? "movcues-builder-checklist-tab" : "movcues-builder-blocks-tab"}>
          {checklistMode ? <><div ref={blocksRef} className="movcues-builder-blocks-target--hidden" /><div className="movcues-checklist-structured-inspector">{checklistInspector}</div></> : <><p className="movcues-builder-hint">Drag blocks into the canvas, then select an element to customize it.</p><div ref={blocksRef} /></>}
        </div>
        <div className={`movcues-builder-tab-panel${sidebarTab === "properties" ? "" : " movcues-builder-tab-panel--hidden"}`} role="tabpanel" id="movcues-builder-properties-panel" aria-labelledby={checklistMode ? "movcues-builder-design-tab" : "movcues-builder-properties-tab"}>
          <GrapesWidgetInspector editor={editorRef.current} component={selectedComponent} isFreeItem={Boolean(selectedComponent && selectedFreeItemRef.current === selectedComponent)} styleRevision={styleRevision} readStyle={readInspectorStyle} onStyleChange={(component, patch) => applyInspectorStyleRef.current(component, patch)} onSelect={component => editorRef.current?.select(component)} traitsRef={traitsRef} stylesRef={stylesRef} widgetSize={widgetSizeInspector} freePosition={freePositionInspector} interaction={interactionInspector} />
        </div>
      </aside>
      <div ref={canvasViewportRef} className={`movcues-builder-canvas${handTool || spacePressed ? " movcues-builder-canvas--pan-ready" : ""}${panning ? " movcues-builder-canvas--panning" : ""}`}><div ref={canvasRef} className="movcues-builder-editor" /><div className={`movcues-builder-pan-layer${handTool || spacePressed || panning ? " movcues-builder-pan-layer--active" : ""}`} aria-hidden="true" onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} />{(!ready || !positioned) && <div className="movcues-builder-loading">Loading builder…</div>}</div>
    </div>
    {!codeMode && <div className="movcues-builder-canvas-zoom" role="group" aria-label="Canvas zoom"><Button type="button" size="icon" variant="outline" aria-label="Zoom out" disabled={zoomLabel <= MIN_CANVAS_ZOOM} onClick={() => zoomBy(-CANVAS_ZOOM_STEP)}><Minus /></Button><output className="movcues-builder-zoom" aria-label="Zoom percentage">{zoomLabel}%</output><Button type="button" size="icon" variant="outline" aria-label="Zoom in" disabled={zoomLabel >= MAX_CANVAS_ZOOM} onClick={() => zoomBy(CANVAS_ZOOM_STEP)}><Plus /></Button></div>}
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

const SURVEY_QUESTION_BLOCK_PREFIX = "survey-question:";
const SURVEY_QUESTION_TYPES: SurveyQuestion["type"][] = ["single_choice", "multiple_choice", "short_text", "long_text", "rating", "nps"];

function surveyQuestionBlocks() {
  const definitions: Array<[SurveyQuestion["type"], string, LucideIcon]> = [
    ["single_choice", "Single choice", CircleDot],
    ["multiple_choice", "Multiple choice", List],
    ["short_text", "Short text", Type],
    ["long_text", "Long text", Rows3],
    ["rating", "Rating", Star],
    ["nps", "NPS", BadgeIcon],
  ];
  return definitions.map(([type, label, Icon]) => ({ id: `${SURVEY_QUESTION_BLOCK_PREFIX}${type}`, label, media: blockIcon(Icon), category: "Questions", content: { type: "movcues-survey-question-gateway", tagName: "div", attributes: { "data-movcues-survey-question-gateway": type } } }));
}

function surveyQuestionTypeForBlock(block?: Block): SurveyQuestion["type"] | null {
  const id = String(block?.getId?.() ?? block?.get?.("id") ?? "");
  const type = id.startsWith(SURVEY_QUESTION_BLOCK_PREFIX) ? id.slice(SURVEY_QUESTION_BLOCK_PREFIX.length) as SurveyQuestion["type"] : null;
  return type && SURVEY_QUESTION_TYPES.includes(type) ? type : null;
}

function surveyQuestionTypeForGateway(component?: Component): SurveyQuestion["type"] | null {
  const type = String(component?.getAttributes?.()["data-movcues-survey-question-gateway"] ?? "") as SurveyQuestion["type"];
  return SURVEY_QUESTION_TYPES.includes(type) ? type : null;
}

function surveyGatewayPlacement(root: Component, gateway: Component): number | undefined {
  if (gateway.parent?.() !== root) return undefined;
  const gatewayIndex = gateway.index?.();
  if (typeof gatewayIndex !== "number" || gatewayIndex < 0) return undefined;
  let placement = 0;
  root.components()?.forEach?.((component: Component) => {
    if (component === gateway || component.index?.() >= gatewayIndex) return;
    const ownId = component.getAttributes?.()["data-movcues-question-id"];
    const nested = component.find?.("[data-movcues-question-id]") ?? [];
    if (ownId) placement += 1;
    else placement += nested.length;
  });
  return placement;
}

function cssAttributeEscape(value: string): string { return value.replace(/["\\]/g, "\\$&"); }

function blocks(interactionContext: NonNullable<Props["interactionContext"]>) { const generic = [
  { id: "free-area", label: "Free Area", media: blockIcon(Maximize2), category: "Layout", content: { type: "movcues-free-area", tagName: "div", classes: [FREE_AREA_CLASS] } },
  { id: "container", label: "Container", media: blockIcon(Box), category: "Layout", content: { type: "default", tagName: "div", classes: ["movcues-widget__container"], components: "Container" } },
  { id: "row", label: "Row", media: blockIcon(Rows3), category: "Layout", content: '<div class="movcues-widget__row"><div class="movcues-widget__column">Column</div><div class="movcues-widget__column">Column</div></div>' },
  { id: "columns", label: "Columns", media: blockIcon(Columns3), category: "Layout", content: '<div class="movcues-widget__columns"><div class="movcues-widget__column">Left</div><div class="movcues-widget__column">Right</div></div>' },
  { id: "heading", label: "Heading", media: blockIcon(Heading2), category: "Content", content: '<h2 class="movcues-widget__heading">Heading</h2>' },
  { id: "text", label: "Text", media: blockIcon(Type), category: "Content", content: '<p class="movcues-widget__body">Add your message.</p>' },
  { id: "image", label: "Image", media: blockIcon(ImageIcon), category: "Content", content: { type: "image", tagName: "img", attributes: { class: "movcues-widget__image", alt: "" } }, activate: true },
  { id: "icon", label: "Icon", media: blockIcon(Star), category: "Content", content: '<span class="movcues-widget__icon" role="img" aria-label="Icon">★</span>' },
  { id: "divider", label: "Divider", media: blockIcon(Minus), category: "Content", content: '<hr class="movcues-widget__divider">' },
  { id: "badge", label: "Badge", media: blockIcon(BadgeIcon), category: "Content", content: '<span class="movcues-widget__badge">New</span>' },
  { id: "avatar", label: "Avatar", media: blockIcon(CircleUserRound), category: "Content", content: { type: "default", tagName: "div", classes: ["movcues-widget__avatar"], components: [{ type: "movcues-avatar-image", tagName: "img", classes: ["movcues-widget__avatar-image"], attributes: { src: "", alt: "" } }] } },
  { id: "list", label: "List", media: blockIcon(List), category: "Content", content: '<ul class="movcues-widget__list"><li>First item</li><li>Second item</li><li>Third item</li></ul>' },
  { id: "spacer", label: "Spacer", media: blockIcon(MoveVertical), category: "Layout", content: '<div class="movcues-widget__spacer">&nbsp;</div>' },
  { id: "button", label: "Button", media: blockIcon(MousePointerClick), category: "Actions", content: '<button class="movcues-widget__button" data-movcues-action-id="primary">Continue</button>' },
  { id: "secondary-button", label: "Secondary button", media: blockIcon(SquareMousePointer), category: "Actions", content: '<button class="movcues-widget__button movcues-widget__button--secondary" data-movcues-action-id="secondary">Dismiss</button>' },
  { id: "progress", label: "Progress", media: blockIcon(CircleDot), category: "Guide", content: '<div class="movcues-widget__progress" aria-label="Progress"><span class="movcues-widget__progress-dot movcues-widget__progress-dot--active"></span><span class="movcues-widget__progress-dot"></span><span class="movcues-widget__progress-dot"></span></div>' },
  { id: "close", label: "Close", media: blockIcon(X), category: "Guide", content: '<button class="movcues-widget__close" type="button" aria-label="Close">&times;</button>' },
]; return interactionContext === "survey" ? [...surveyQuestionBlocks(), ...generic] : generic; }

function blockIcon(Icon: LucideIcon): string {
  return renderToStaticMarkup(<Icon aria-hidden="true" focusable="false" strokeWidth={1.8} />);
}

const NEW_BLOCK_STYLES: Record<string, Array<[string, Record<string, string>]>> = {
  "movcues-widget__container": [[".movcues-widget .movcues-widget__container", { display: "flex", "flex-direction": "column" }]],
  "movcues-widget__row": [[".movcues-widget .movcues-widget__row", { display: "flex", "flex-direction": "row" }]],
  "movcues-widget__columns": [[".movcues-widget .movcues-widget__columns", { display: "flex", "flex-direction": "row" }]],
  "movcues-widget__column": [[".movcues-widget .movcues-widget__column", { display: "flex", "flex-direction": "column" }]],
  "movcues-widget__badge": [[".movcues-widget .movcues-widget__badge", { display: "inline-flex", "align-items": "center", padding: "2px 8px", "border-radius": "999px", background: "rgba(15,23,42,.08)", color: "inherit", "font-size": "12px", "line-height": "1.5" }]],
  "movcues-widget__avatar": [
    [".movcues-widget .movcues-widget__avatar", { width: "40px", height: "40px", overflow: "hidden", "border-radius": "50%", background: "rgba(15,23,42,.08)" }],
    [".movcues-widget .movcues-widget__avatar img", { display: "block", width: "100%", height: "100%", "object-fit": "cover" }],
  ],
  "movcues-widget__list": [[".movcues-widget .movcues-widget__list", { margin: "0", "padding-left": "20px", "line-height": "1.5" }]],
  "movcues-widget__progress": [
    [".movcues-widget .movcues-widget__progress", { display: "flex", "align-items": "center", gap: "6px", color: "inherit" }],
    [".movcues-widget .movcues-widget__progress-dot", { display: "block", width: "8px", height: "8px", "border-radius": "50%", background: "currentColor", opacity: ".3" }],
    [".movcues-widget .movcues-widget__progress-dot--active", { opacity: "1" }],
  ],
  "movcues-widget__close": [[".movcues-widget .movcues-widget__close", { display: "inline-grid", width: "32px", height: "32px", "place-items": "center", padding: "0", border: "0", "border-radius": "50%", background: "transparent", color: "inherit", "font-size": "20px", "line-height": "1", cursor: "pointer" }]],
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
  return <div className="movcues-builder-size"><h3>Widget size</h3>{widgetType === "banner" ? <><Label>Width<Input value="Full width" disabled /></Label><p>Banner width is locked to its container.</p></> : <><Label>Width mode<select value={size.width.mode} onChange={event => { const mode = event.target.value as "fixed" | "full"; const next = mode === "full" ? { width: { mode: "full" as const }, height: { mode: "viewport" as const } } : { ...size, width: { mode: "fixed" as const, value: typeof constraint.width.default === "number" ? constraint.width.default : constraint.width.min } }; setNotice(""); persist(next); }}><option value="fixed">Fixed</option>{constraint.width.allowFull && <option value="full">Fullscreen</option>}</select></Label>{size.width.mode === "fixed" && <Label>Width<div className="movcues-size-input"><Input aria-label="Widget width" type="number" min={constraint.width.min} max={constraint.width.max} value={width} onChange={event => { setWidth(event.target.value); previewWidth(event.target.value); }} onBlur={commitWidth} /><span>px</span></div></Label>}</>}{constraint.height.allowFixed && <><Label>Height<select value={size.height.mode} onChange={event => { const mode = event.target.value as ExperienceSize["height"]["mode"]; const next = { ...size, height: mode === "fixed" ? { mode, value: constraint.height.min } : { mode } }; setNotice(""); persist(next); }}><option value="auto">Auto</option><option value="fixed">Fixed</option>{constraint.height.allowViewport && <option value="viewport">Viewport safe</option>}</select></Label>{size.height.mode === "fixed" && <Label>Height<div className="movcues-size-input"><Input aria-label="Widget height" type="number" min={constraint.height.min} max={constraint.height.max} value={height} onChange={event => { setHeight(event.target.value); previewHeight(event.target.value); }} onBlur={commitHeight} /><span>px</span></div></Label>}</>}{!constraint.height.allowFixed && widgetType !== "banner" && <Label>Height<Input value="Auto" disabled /></Label>}<p>{notice || (constraint.width.max ? `Allowed width: ${constraint.width.min}–${constraint.width.max}px.` : "")}</p></div>;
}

function widgetLabel(widgetType: WidgetType): string { return widgetType.split("_").map(value => value[0].toUpperCase() + value.slice(1)).join(" "); }

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
  if (component.getClasses?.().includes("movcues-widget")) return ".movcues-widget";
  const styleClass = component.getClasses?.().find(name => name.startsWith(STYLE_CLASS_PREFIX));
  return styleClass ? `.movcues-widget .${styleClass}` : null;
}

function ensureCanonicalStyleSelector(component: Component): string {
  const existing = canonicalStyleSelector(component);
  if (existing) return existing;
  styleClassSequence += 1;
  const styleClass = `${STYLE_CLASS_PREFIX}${Date.now().toString(36)}-${styleClassSequence.toString(36)}`;
  component.addClass(styleClass);
  return `.movcues-widget .${styleClass}`;
}

import type { Component, ComponentResizeEventUpdateProps, Editor, ResizerOptions, StyleProps } from "grapesjs";
import type { ExperienceDesign, ExperienceSize, WidgetType } from "../../types/experiences";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS } from "./widgetSizing";

export const FREE_AREA_CLASS = "movecues-free-area";
export const FREE_AREA_CLASS_PREFIX = "movecues-free-area--";
export const FREE_LAYOUT_ITEM_CLASS = "movecues-free-item";
export const FREE_LAYOUT_ITEM_CLASS_PREFIX = "movecues-free-item--";

const FLOW_BOX_PROPERTY = "movecuesFreeLayoutFlowBox";
const FLOW_DRAGGABLE_PROPERTY = "movecuesFreeLayoutDraggable";
const LEGACY_FREE_ROOT_CLASS = "movecues-widget--free-layout";
const LEGACY_FREE_ROOT_SELECTOR = `.movecues-widget.${LEGACY_FREE_ROOT_CLASS}`;
const BOX_PROPERTIES = ["position", "top", "right", "bottom", "left", "width", "height", "z-index"] as const;
const GRID_SIZE = 4;
let freeItemSequence = 0;
let freeAreaSequence = 0;

type InteractionKind = "root" | "image" | "icon" | "text" | "button" | "divider" | "layout" | "spacer";
type ComponentStyle = StyleProps;

export interface FreeItemBox { x: number; y: number; width: number; height: number }

export interface RootResizeResult {
  size: ExperienceSize;
  style: ComponentStyle;
}

interface InteractionOptions {
  widgetType: WidgetType;
  design: () => ExperienceDesign;
  onRootResize: (size: ExperienceSize, commit: boolean) => void;
  onFreeItemChange?: (component: Component | null, box: FreeItemBox | null) => void;
  onMutation?: () => void;
  canStartFreeDrag?: (target: EventTarget | null) => boolean;
}

export interface WidgetInteractionController {
  syncFreeAreas: () => void;
  select: (component?: Component) => void;
  isEditing: () => boolean;
  isFreeItem: (component?: Component | null) => boolean;
  getFreeItemBox: (component: Component) => FreeItemBox | null;
  updateFreeItemBox: (component: Component, next: Partial<FreeItemBox>) => void;
  moveLayer: (component: Component, direction: "forward" | "backward") => void;
  destroy: () => void;
}

interface FreeDragGesture {
  pointerId: number;
  component: Component;
  grabOffsetX: number;
  grabOffsetY: number;
  initialStyle: ComponentStyle;
  captureTarget: HTMLElement | null;
  moved: boolean;
  undoStopped: boolean;
}

const ALL_HANDLES = { tl: true, tc: true, tr: true, cl: true, cr: true, bl: true, bc: true, br: true };
const WIDTH_HANDLES = { tl: false, tc: false, tr: false, cl: true, cr: true, bl: false, bc: false, br: false };

export function isFreeArea(component?: Component | null): boolean {
  return Boolean(component?.getClasses?.().includes(FREE_AREA_CLASS));
}

export function interactionKind(component: Component): InteractionKind | null {
  const classes = new Set(component.getClasses?.() ?? []);
  const tagName = String(component.get?.("tagName") ?? component.getEl?.()?.tagName ?? "").toLowerCase();
  if (classes.has("movecues-widget")) return "root";
  if (tagName === "img" || component.is?.("image")) return "image";
  if (classes.has("movecues-widget__icon")) return "icon";
  if (tagName === "button" || classes.has("movecues-widget__button")) return "button";
  if (["h1", "h2", "h3", "h4", "p"].includes(tagName) || classes.has("movecues-widget__heading") || classes.has("movecues-widget__body") || classes.has("movecues-widget__eyebrow")) return "text";
  if (tagName === "hr" || classes.has("movecues-widget__divider")) return "divider";
  if (classes.has("movecues-widget__spacer")) return "spacer";
  if (["movecues-widget__container", "movecues-widget__row", "movecues-widget__columns", "movecues-widget__column", "movecues-widget__message", "movecues-widget__actions"].some(name => classes.has(name))) return "layout";
  return null;
}

export function getElementBoxInWidgetSpace(element: HTMLElement, rootElement: HTMLElement): FreeItemBox | null {
  try {
    const rootRect = rootElement.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scaleX = renderedScale(rootRect.width, rootElement.offsetWidth || rootElement.clientWidth);
    const scaleY = renderedScale(rootRect.height, rootElement.offsetHeight || rootElement.clientHeight, scaleX);
    const box = { x: (elementRect.left - rootRect.left) / scaleX, y: (elementRect.top - rootRect.top) / scaleY, width: elementRect.width / scaleX, height: elementRect.height / scaleY };
    return Object.values(box).every(Number.isFinite) ? box : null;
  } catch { return null; }
}

export function clientPointToWidgetSpace(clientX: number, clientY: number, rootElement: HTMLElement): { x: number; y: number } | null {
  try {
    const rootRect = rootElement.getBoundingClientRect();
    const scaleX = renderedScale(rootRect.width, rootElement.offsetWidth || rootElement.clientWidth);
    const scaleY = renderedScale(rootRect.height, rootElement.offsetHeight || rootElement.clientHeight, scaleX);
    const point = { x: (clientX - rootRect.left) / scaleX, y: (clientY - rootRect.top) / scaleY };
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
  } catch { return null; }
}

export function resizeOptionsForComponent(component: Component, widgetType: WidgetType): false | ResizerOptions {
  const kind = interactionKind(component);
  if (!kind) return false;
  if (kind === "root") {
    const constraint = WIDGET_SIZE_CONSTRAINTS[widgetType];
    if (typeof constraint.width.default !== "number") return false;
    return constraint.height.allowFixed
      ? { ...ALL_HANDLES, minDim: Math.min(constraint.width.min!, constraint.height.min!), maxDim: Math.max(constraint.width.max!, constraint.height.max!), step: GRID_SIZE }
      : { ...WIDTH_HANDLES, minDim: constraint.width.min, maxDim: constraint.width.max, step: GRID_SIZE };
  }
  if (kind === "text") return { ...WIDTH_HANDLES, minDim: 48, step: GRID_SIZE };
  if (kind === "image") return { ...ALL_HANDLES, ratioDefault: true, minDim: 24, step: GRID_SIZE };
  return { ...ALL_HANDLES, minDim: kind === "button" ? 24 : 16, step: GRID_SIZE };
}

export function rootResizeResult(widgetType: WidgetType, design: ExperienceDesign, rect: { w: number; h: number }, style: ComponentStyle): RootResizeResult | null {
  const size = normalizeWidgetSize(widgetType, design);
  let next = size;
  const nextStyle = { ...style };
  let changed = false;
  if (Object.prototype.hasOwnProperty.call(style, "width") && typeof WIDGET_SIZE_CONSTRAINTS[widgetType].width.default === "number") {
    const width = clampWidgetWidth(widgetType, numericStyle(style.width, rect.w)).value;
    next = { ...next, width: { mode: "fixed", value: width } };
    nextStyle.width = `${width}px`;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(style, "height") && WIDGET_SIZE_CONSTRAINTS[widgetType].height.allowFixed) {
    const height = clampWidgetHeight(widgetType, numericStyle(style.height, rect.h)).value;
    next = { ...next, height: { mode: "fixed", value: height } };
    nextStyle.height = `${height}px`;
    changed = true;
  }
  return changed ? { size: next, style: nextStyle } : null;
}

export function installWidgetInteractions(editor: Editor, options: InteractionOptions): WidgetInteractionController {
  let selected: Component | null = null;
  let editing: Component | null = null;
  let dragGesture: FreeDragGesture | null = null;
  let dragDocument: Document | null = null;
  const freeAreaParents = new WeakMap<Component, Component>();

  const getRoot = () => editor.getWrapper()?.find(".movecues-widget")[0];
  const findFreeAreaParent = (component?: Component | null) => isFreeArea(component?.parent?.()) ? component!.parent!() : null;
  const isFreeItem = (component?: Component | null) => {
    return Boolean(component && findFreeAreaParent(component) && component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS));
  };
  const getFreeItemBox = (component: Component): FreeItemBox | null => {
    if (!isFreeItem(component)) return null;
    const rule = editor.Css.getRule(freeItemSelector(component));
    const style = (rule?.getStyle() ?? {}) as ComponentStyle;
    const element = component.getEl?.();
    const areaElement = findFreeAreaParent(component)?.getEl?.();
    const measured = element && areaElement ? getElementBoxInWidgetSpace(element, areaElement) : null;
    return {
      x: numericStyle(style.left, measured?.x ?? element?.offsetLeft ?? 0),
      y: numericStyle(style.top, measured?.y ?? element?.offsetTop ?? 0),
      width: numericStyle(style.width, measured?.width ?? element?.offsetWidth ?? 0),
      height: numericStyle(style.height, measured?.height ?? element?.offsetHeight ?? 0),
    };
  };
  const notifySelected = (component = selected) => {
    if (!component || !isFreeItem(component)) { options.onFreeItemChange?.(null, null); return; }
    options.onFreeItemChange?.(component, getFreeItemBox(component));
  };
  const writeFreeItemBox = (component: Component, next: Partial<FreeItemBox>, commit: boolean) => {
    if (!isFreeItem(component)) return;
    const current = getFreeItemBox(component) ?? { x: 0, y: 0, width: 0, height: 0 };
    const merged = constrainBox(component, { ...current, ...next });
    const selector = freeItemSelector(component);
    const previous = (editor.Css.getRule(selector)?.getStyle() ?? {}) as ComponentStyle;
    const style: ComponentStyle = { ...previous, position: "absolute", left: `${Math.round(merged.x)}px`, top: `${Math.round(merged.y)}px`, right: "auto", bottom: "auto", width: `${Math.max(1, Math.round(merged.width))}px` };
    if (interactionKind(component) !== "text" || next.height !== undefined || previous.height !== undefined) style.height = `${Math.max(1, Math.round(merged.height))}px`;
    editor.Css.setRule(selector, style);
    if (component === selected) notifySelected(component);
    if (commit) options.onMutation?.();
  };
  const updateFreeItemBox = (component: Component, next: Partial<FreeItemBox>) => writeFreeItemBox(component, next, true);
  const configureFreeItem = (component: Component, box?: FreeItemBox, initialize = false) => {
    const area = findFreeAreaParent(component);
    if (!area || interactionKind(component) === "root" || isFreeArea(component) || editing === component) return;
    if (component.get(FLOW_BOX_PROPERTY) === undefined) component.set(FLOW_BOX_PROPERTY, pickBoxStyles(component.getStyle() as ComponentStyle));
    ensureFreeItemClasses(component);
    if (component.get(FLOW_DRAGGABLE_PROPERTY) === undefined) component.set(FLOW_DRAGGABLE_PROPERTY, component.get("draggable"));
    component.set("draggable", false);
    component.setDragMode("absolute");
    component.set("resizable", resizeOptionsForComponent(component, options.widgetType));
    const selector = freeItemSelector(component);
    if (initialize || !editor.Css.getRule(selector)) {
      const measured = box ?? measureBox(component, area);
      if (measured) writeFreeItemBox(component, interactionKind(component) === "text" ? { x: measured.x, y: measured.y, width: measured.width } : measured, false);
    }
    freeAreaParents.set(component, area);
  };
  const removeFreeItem = (component: Component) => {
    const uniqueClass = getFreeItemClass(component);
    if (uniqueClass) editor.Css.remove(`.movecues-widget .${uniqueClass}`);
    component.setDragMode();
    component.set("draggable", component.get(FLOW_DRAGGABLE_PROPERTY));
    component.set(FLOW_DRAGGABLE_PROPERTY, undefined);
    const resizable = resizeOptionsForComponent(component, options.widgetType);
    if (resizable) component.set("resizable", resizable);
    const currentStyle = component.getStyle() as ComponentStyle;
    component.setStyle(restoreBoxStyles(currentStyle, component.get(FLOW_BOX_PROPERTY) as ComponentStyle | undefined));
    component.set(FLOW_BOX_PROPERTY, undefined);
    const removable = component.getClasses?.().filter(name => name === FREE_LAYOUT_ITEM_CLASS || name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX)) ?? [];
    if (removable.length) component.removeClass(removable);
    freeAreaParents.delete(component);
  };
  const configureFreeArea = (area: Component) => {
    if (findAncestorFreeArea(area)) { area.remove(); options.onMutation?.(); return; }
    const uniqueClass = ensureFreeAreaClasses(area); const selector = `.movecues-widget .${uniqueClass}`;
    if (!editor.Css.getRule(selector)) editor.Css.setRule(selector, { position: "relative", width: "100%", "min-height": "240px" });
    area.setDragMode(); area.set("resizable", { ...ALL_HANDLES, minDim: 120, step: GRID_SIZE });
    for (const child of directChildren(area)) configureFreeItem(child);
  };
  const syncFreeAreas = () => {
    const root = getRoot(); if (!root) return; let changed = false;
    if (root.getClasses?.().includes(LEGACY_FREE_ROOT_CLASS)) { root.removeClass(LEGACY_FREE_ROOT_CLASS); changed = true; }
    if (editor.Css.getRule(LEGACY_FREE_ROOT_SELECTOR)) { editor.Css.remove(LEGACY_FREE_ROOT_SELECTOR); changed = true; }
    walkComponents(root, component => {
      if (isFreeArea(component)) { const existingClass = getFreeAreaClass(component); const existingRule = existingClass && editor.Css.getRule(`.movecues-widget .${existingClass}`); configureFreeArea(component); if (!existingClass || !existingRule) changed = true; }
      else if (findFreeAreaParent(component)) { const existingClass = getFreeItemClass(component); const existingRule = existingClass && editor.Css.getRule(`.movecues-widget .${existingClass}`); configureFreeItem(component); if (!existingClass || !existingRule) changed = true; }
      else if (component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) { removeFreeItem(component); changed = true; }
    });
    notifySelected();
    if (changed) options.onMutation?.();
  };
  const reconcileFreeItemFromDom = (component?: Component, commit = true) => {
    if (!component || !isFreeItem(component) || editing === component) return;
    const area = findFreeAreaParent(component); const box = area ? measureBox(component, area) : null;
    if (box) writeFreeItemBox(component, interactionKind(component) === "text" ? { x: box.x, y: box.y, width: box.width } : box, commit);
    component.setStyle(restoreBoxStyles(component.getStyle() as ComponentStyle, component.get(FLOW_BOX_PROPERTY) as ComponentStyle | undefined));
  };
  const configure = (component: Component) => {
    if (!component) return;
    if (isFreeArea(component)) { configureFreeArea(component); options.onMutation?.(); return; }
    const kind = interactionKind(component);
    const resizable = resizeOptionsForComponent(component, options.widgetType);
    if (resizable) component.set("resizable", resizable);
    if (kind === "root") return;
    const area = findFreeAreaParent(component); const previousArea = freeAreaParents.get(component);
    if (area) { configureFreeItem(component, previousArea && previousArea !== area ? measureBox(component, area) ?? undefined : undefined, Boolean(previousArea && previousArea !== area)); options.onMutation?.(); }
    else if (component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) { removeFreeItem(component); options.onMutation?.(); }
    else component.setDragMode();
  };
  const select = (component?: Component) => { selected = component && isFreeItem(component) ? component : null; notifySelected(); };
  const moveLayer = (component: Component, direction: "forward" | "backward") => {
    const root = getRoot(); if (!root || !isFreeItem(component)) return;
    const currentIndex = component.index();
    const nextIndex = Math.max(0, Math.min(directChildren(root).length - 1, currentIndex + (direction === "forward" ? 1 : -1)));
    if (nextIndex !== currentIndex) { component.move(root, { at: nextIndex }); options.onMutation?.(); }
  };

  const endFreeDrag = (event: PointerEvent, cancelled = false) => {
    const gesture = dragGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    dragGesture = null;
    if (cancelled) editor.Css.setRule(freeItemSelector(gesture.component), gesture.initialStyle);
    else if (gesture.moved) {
      const finalStyle = (editor.Css.getRule(freeItemSelector(gesture.component))?.getStyle() ?? {}) as ComponentStyle;
      if (gesture.undoStopped) {
        editor.Css.setRule(freeItemSelector(gesture.component), gesture.initialStyle);
        editor.UndoManager.start();
        editor.Css.setRule(freeItemSelector(gesture.component), finalStyle);
      }
      options.onMutation?.();
    }
    if (gesture.undoStopped && (cancelled || !gesture.moved)) editor.UndoManager.start();
    try { gesture.captureTarget?.releasePointerCapture?.(event.pointerId); } catch { /* Pointer capture can already be released when the iframe loses focus. */ }
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const onFreePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false || editing || editor.getEditing?.() || isEditableEventTarget(event.target) || options.canStartFreeDrag?.(event.target) === false) return;
    const component = editor.getSelected?.() ?? selected;
    const area = findFreeAreaParent(component); const element = component?.getEl?.(); const areaElement = area?.getEl?.();
    const targetNode = event.target as Node | null;
    if (!component || !isFreeItem(component) || !element || !areaElement || !targetNode || !element.contains(targetNode)) return;
    const point = clientPointToWidgetSpace(event.clientX, event.clientY, areaElement); const box = getFreeItemBox(component);
    if (!point || !box) return;
    const undoManager = editor.UndoManager as unknown as { isTracking?: () => boolean; stop: () => void };
    const undoStopped = undoManager.isTracking?.() !== false; if (undoStopped) undoManager.stop();
    const captureTarget = event.target as HTMLElement | null;
    try { captureTarget?.setPointerCapture?.(event.pointerId); } catch { /* Continue with document-level listeners when capture is unavailable. */ }
    dragGesture = { pointerId: event.pointerId, component, grabOffsetX: point.x - box.x, grabOffsetY: point.y - box.y, initialStyle: (editor.Css.getRule(freeItemSelector(component))?.getStyle() ?? {}) as ComponentStyle, captureTarget, moved: false, undoStopped };
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const onFreePointerMove = (event: PointerEvent) => {
    const gesture = dragGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const areaElement = findFreeAreaParent(gesture.component)?.getEl?.(); const point = areaElement ? clientPointToWidgetSpace(event.clientX, event.clientY, areaElement) : null;
    if (point) { gesture.moved = true; writeFreeItemBox(gesture.component, { x: point.x - gesture.grabOffsetX, y: point.y - gesture.grabOffsetY }, false); }
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const onFreePointerCancel = (event: PointerEvent) => endFreeDrag(event, true);
  const bindFreeDragDocument = () => {
    const nextDocument = (editor.Canvas as { getDocument?: () => Document } | undefined)?.getDocument?.();
    if (!nextDocument || nextDocument === dragDocument) return;
    dragDocument?.removeEventListener("pointerdown", onFreePointerDown, true); dragDocument?.removeEventListener("pointermove", onFreePointerMove, true); dragDocument?.removeEventListener("pointerup", endFreeDrag, true); dragDocument?.removeEventListener("pointercancel", onFreePointerCancel, true);
    dragDocument = nextDocument;
    dragDocument.addEventListener("pointerdown", onFreePointerDown, true); dragDocument.addEventListener("pointermove", onFreePointerMove, true); dragDocument.addEventListener("pointerup", endFreeDrag, true); dragDocument.addEventListener("pointercancel", onFreePointerCancel, true);
  };

  editor.on("component:create", configure);
  editor.on("component:add", configure);
  editor.on("component:mount", configure);
  editor.on("component:remove", (component: Component) => {
    if (isFreeArea(component)) {
      const uniqueClass = getFreeAreaClass(component); if (uniqueClass) editor.Css.remove(`.movecues-widget .${uniqueClass}`);
      walkComponents(component, child => { if (child !== component && child.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) removeFreeItem(child); });
    } else {
      const uniqueClass = getFreeItemClass(component); if (uniqueClass) editor.Css.remove(`.movecues-widget .${uniqueClass}`);
    }
    options.onMutation?.();
  });
  editor.on("rte:enable", () => { editing = editor.getEditing?.() ?? editor.getSelected?.() ?? null; });
  editor.on("rte:disable", () => { editing = null; options.onMutation?.(); });
  editor.on("component:drag:end", ({ target }: { target?: Component }) => { if (target) configure(target); reconcileFreeItemFromDom(target); });
  editor.on("component:resize:end", ({ component }: { component: Component }) => { if (isFreeItem(component)) reconcileFreeItemFromDom(component); else if (interactionKind(component) === "root" || isFreeArea(component)) options.onMutation?.(); });
  editor.on("component:resize:update", (event: ComponentResizeEventUpdateProps) => {
    if (isFreeArea(event.component)) {
      const selector = freeAreaSelector(event.component); const previous = (editor.Css.getRule(selector)?.getStyle() ?? {}) as ComponentStyle; const style = { ...previous };
      if (event.style.width !== undefined) style.width = `${Math.max(1, Math.round(numericStyle(event.style.width, event.rect.w)))}px`;
      if (event.style.height !== undefined) style.height = `${Math.max(120, Math.round(numericStyle(event.style.height, event.rect.h)))}px`;
      editor.Css.setRule(selector, style); event.updateStyle({}); return;
    }
    if (isFreeItem(event.component)) {
      const current = getFreeItemBox(event.component);
      if (current) {
        const box = { x: numericStyle(event.style.left, current.x), y: numericStyle(event.style.top, current.y), width: numericStyle(event.style.width, event.rect.w) };
        writeFreeItemBox(event.component, interactionKind(event.component) === "text" ? box : { ...box, height: numericStyle(event.style.height, event.rect.h) }, false);
      }
      event.updateStyle({});
      return;
    }
    if (interactionKind(event.component) !== "root") return;
    const result = rootResizeResult(options.widgetType, options.design(), event.rect, event.style);
    if (!result) return;
    event.updateStyle(result.style);
    options.onRootResize(result.size, !event.partial);
  });

  bindFreeDragDocument();
  const destroy = () => {
    if (dragGesture?.undoStopped) editor.UndoManager.start();
    dragGesture = null;
    dragDocument?.removeEventListener("pointerdown", onFreePointerDown, true); dragDocument?.removeEventListener("pointermove", onFreePointerMove, true); dragDocument?.removeEventListener("pointerup", endFreeDrag, true); dragDocument?.removeEventListener("pointercancel", onFreePointerCancel, true);
    dragDocument = null;
  };
  return { syncFreeAreas: () => { bindFreeDragDocument(); syncFreeAreas(); }, select, isEditing: () => Boolean(editing || editor.getEditing?.()), isFreeItem, getFreeItemBox, updateFreeItemBox, moveLayer, destroy };
}

function directChildren(root: Component): Component[] {
  const children: Component[] = [];
  root.components?.()?.forEach((component: Component) => children.push(component));
  return children;
}

function walkComponents(root: Component, visit: (component: Component) => void): void {
  visit(root);
  for (const child of directChildren(root)) walkComponents(child, visit);
}

function findAncestorFreeArea(component: Component): Component | null {
  let parent = component.parent?.();
  while (parent) { if (isFreeArea(parent)) return parent; parent = parent.parent?.(); }
  return null;
}

function measureBox(component: Component, root: Component): FreeItemBox | null {
  const element = component.getEl?.(); const rootElement = root.getEl?.();
  if (!element || !rootElement) return null;
  return getElementBoxInWidgetSpace(element, rootElement);
}

function constrainBox(component: Component, box: FreeItemBox): FreeItemBox {
  const rootElement = component.parent?.()?.getEl?.();
  if (!rootElement) return box;
  const rootWidth = rootElement.clientWidth || rootElement.offsetWidth;
  const rootHeight = rootElement.clientHeight || rootElement.offsetHeight;
  const width = Math.max(1, Math.min(box.width || 1, rootWidth || box.width || 1));
  const height = Math.max(1, Math.min(box.height || 1, rootHeight || box.height || 1));
  return { x: Math.max(0, Math.min(box.x, Math.max(0, rootWidth - width))), y: Math.max(0, Math.min(box.y, Math.max(0, rootHeight - height))), width, height };
}

function ensureFreeItemClasses(component: Component): string {
  let uniqueClass = getFreeItemClass(component);
  if (!uniqueClass) {
    freeItemSequence += 1;
    uniqueClass = `${FREE_LAYOUT_ITEM_CLASS_PREFIX}${Date.now().toString(36)}-${freeItemSequence.toString(36)}`;
    component.addClass(uniqueClass);
  }
  if (!component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) component.addClass(FREE_LAYOUT_ITEM_CLASS);
  return uniqueClass;
}

function ensureFreeAreaClasses(component: Component): string {
  let uniqueClass = getFreeAreaClass(component);
  if (!uniqueClass) {
    freeAreaSequence += 1;
    uniqueClass = `${FREE_AREA_CLASS_PREFIX}${Date.now().toString(36)}-${freeAreaSequence.toString(36)}`;
    component.addClass(uniqueClass);
  }
  if (!component.getClasses?.().includes(FREE_AREA_CLASS)) component.addClass(FREE_AREA_CLASS);
  return uniqueClass;
}

function getFreeAreaClass(component: Component): string | undefined {
  return component.getClasses?.().find(name => name.startsWith(FREE_AREA_CLASS_PREFIX));
}

function freeAreaSelector(component: Component): string {
  return `.movecues-widget .${getFreeAreaClass(component) ?? ensureFreeAreaClasses(component)}`;
}

function getFreeItemClass(component: Component): string | undefined {
  return component.getClasses?.().find(name => name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX));
}

function freeItemSelector(component: Component): string {
  return `.movecues-widget .${getFreeItemClass(component) ?? ensureFreeItemClasses(component)}`;
}

function pickBoxStyles(style: ComponentStyle): ComponentStyle {
  return Object.fromEntries(BOX_PROPERTIES.filter(property => style[property] !== undefined).map(property => [property, style[property]]));
}

function restoreBoxStyles(style: ComponentStyle, previous: ComponentStyle = {}): ComponentStyle {
  const restored = { ...style };
  for (const property of BOX_PROPERTIES) {
    if (previous[property] === undefined) delete restored[property];
    else restored[property] = previous[property];
  }
  return restored;
}

function numericStyle(value: ComponentStyle[string] | undefined, fallback: number): number {
  const numeric = Number.parseFloat(typeof value === "string" || typeof value === "number" ? String(value) : "");
  return Number.isFinite(numeric) ? numeric : fallback;
}

function renderedScale(renderedSize: number, logicalSize: number, fallback = 1): number {
  const scale = logicalSize > 0 ? renderedSize / logicalSize : fallback;
  return Number.isFinite(scale) && scale > 0 ? scale : Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  const element = target as { closest?: (selector: string) => Element | null } | null;
  return Boolean(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
}

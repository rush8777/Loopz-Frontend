import type { Component, ComponentResizeEventUpdateProps, Editor, ResizerOptions, StyleProps } from "grapesjs";
import type { ExperienceDesign, ExperienceSize, WidgetType } from "../../types/experiences";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS } from "./widgetSizing";

export const FREE_LAYOUT_ROOT_CLASS = "movecues-widget--free-layout";
export const FREE_LAYOUT_ITEM_CLASS = "movecues-free-item";
export const FREE_LAYOUT_ITEM_CLASS_PREFIX = "movecues-free-item--";
export const FREE_LAYOUT_WIDGET_TYPES = new Set<WidgetType>(["modal", "slideout"]);

const FLOW_BOX_PROPERTY = "movecuesFreeLayoutFlowBox";
const PREVIOUS_HEIGHT_PROPERTY = "movecuesFreeLayoutPreviousHeight";
const ROOT_SELECTOR = `.movecues-widget.${FREE_LAYOUT_ROOT_CLASS}`;
const BOX_PROPERTIES = ["position", "top", "right", "bottom", "left", "width", "height", "z-index"] as const;
const GRID_SIZE = 4;
let freeItemSequence = 0;

type InteractionKind = "root" | "image" | "text" | "button" | "divider" | "layout" | "spacer";
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
  onFreeLayoutChange?: (enabled: boolean) => void;
  onFreeItemChange?: (component: Component | null, box: FreeItemBox | null) => void;
}

export interface WidgetInteractionController {
  isFreeLayout: () => boolean;
  setFreeLayout: (enabled: boolean) => void;
  syncLayoutFromRoot: () => void;
  select: (component?: Component) => void;
  isFreeItem: (component?: Component | null) => boolean;
  getFreeItemBox: (component: Component) => FreeItemBox | null;
  updateFreeItemBox: (component: Component, next: Partial<FreeItemBox>) => void;
  moveLayer: (component: Component, direction: "forward" | "backward") => void;
}

const ALL_HANDLES = { tl: true, tc: true, tr: true, cl: true, cr: true, bl: true, bc: true, br: true };
const WIDTH_HANDLES = { tl: false, tc: false, tr: false, cl: true, cr: true, bl: false, bc: false, br: false };

export function supportsFreeLayout(widgetType: WidgetType): boolean {
  return FREE_LAYOUT_WIDGET_TYPES.has(widgetType);
}

export function interactionKind(component: Component): InteractionKind | null {
  const classes = new Set(component.getClasses?.() ?? []);
  const tagName = String(component.get?.("tagName") ?? component.getEl?.()?.tagName ?? "").toLowerCase();
  if (classes.has("movecues-widget")) return "root";
  if (tagName === "img" || component.is?.("image")) return "image";
  if (tagName === "button" || classes.has("movecues-widget__button")) return "button";
  if (["h1", "h2", "h3", "h4", "p"].includes(tagName) || classes.has("movecues-widget__heading") || classes.has("movecues-widget__body") || classes.has("movecues-widget__eyebrow")) return "text";
  if (tagName === "hr" || classes.has("movecues-widget__divider")) return "divider";
  if (classes.has("movecues-widget__spacer")) return "spacer";
  if (["movecues-widget__container", "movecues-widget__row", "movecues-widget__columns", "movecues-widget__column", "movecues-widget__message", "movecues-widget__actions"].some(name => classes.has(name))) return "layout";
  return null;
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
    const width = clampWidgetWidth(widgetType, rect.w).value;
    next = { ...next, width: { mode: "fixed", value: width } };
    nextStyle.width = `${width}px`;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(style, "height") && WIDGET_SIZE_CONSTRAINTS[widgetType].height.allowFixed) {
    const height = clampWidgetHeight(widgetType, rect.h).value;
    next = { ...next, height: { mode: "fixed", value: height } };
    nextStyle.height = `${height}px`;
    changed = true;
  }
  return changed ? { size: next, style: nextStyle } : null;
}

export function installWidgetInteractions(editor: Editor, options: InteractionOptions): WidgetInteractionController {
  const supported = supportsFreeLayout(options.widgetType);
  let selected: Component | null = null;

  const getRoot = () => editor.getWrapper()?.find(".movecues-widget")[0];
  const isFreeLayout = () => supported && Boolean(getRoot()?.getClasses?.().includes(FREE_LAYOUT_ROOT_CLASS));
  const isFreeItem = (component?: Component | null) => {
    const root = getRoot();
    return Boolean(component && root && component.parent?.() === root && component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS));
  };
  const getFreeItemBox = (component: Component): FreeItemBox | null => {
    if (!isFreeItem(component)) return null;
    const rule = editor.Css.getRule(freeItemSelector(component));
    const style = (rule?.getStyle() ?? {}) as ComponentStyle;
    const element = component.getEl?.();
    const rootElement = getRoot()?.getEl?.();
    const elementRect = element?.getBoundingClientRect();
    const rootRect = rootElement?.getBoundingClientRect();
    return {
      x: numericStyle(style.left, elementRect && rootRect ? elementRect.left - rootRect.left : element?.offsetLeft ?? 0),
      y: numericStyle(style.top, elementRect && rootRect ? elementRect.top - rootRect.top : element?.offsetTop ?? 0),
      width: numericStyle(style.width, elementRect?.width ?? element?.offsetWidth ?? 0),
      height: numericStyle(style.height, elementRect?.height ?? element?.offsetHeight ?? 0),
    };
  };
  const notifySelected = (component = selected) => {
    if (!component || !isFreeItem(component)) { options.onFreeItemChange?.(null, null); return; }
    options.onFreeItemChange?.(component, getFreeItemBox(component));
  };
  const updateFreeItemBox = (component: Component, next: Partial<FreeItemBox>) => {
    if (!isFreeItem(component)) return;
    const current = getFreeItemBox(component) ?? { x: 0, y: 0, width: 0, height: 0 };
    const merged = constrainBox(component, { ...current, ...next });
    const selector = freeItemSelector(component);
    const previous = (editor.Css.getRule(selector)?.getStyle() ?? {}) as ComponentStyle;
    const style: ComponentStyle = { ...previous, position: "absolute", left: `${Math.round(merged.x)}px`, top: `${Math.round(merged.y)}px`, right: "auto", bottom: "auto", width: `${Math.max(1, Math.round(merged.width))}px` };
    if (interactionKind(component) !== "text" || next.height !== undefined || previous.height !== undefined) style.height = `${Math.max(1, Math.round(merged.height))}px`;
    editor.Css.setRule(selector, style);
    if (component === selected) notifySelected(component);
  };
  const configureFreeItem = (component: Component, box?: FreeItemBox) => {
    const root = getRoot();
    if (!root || component.parent?.() !== root || interactionKind(component) === "root") return;
    if (component.get(FLOW_BOX_PROPERTY) === undefined) component.set(FLOW_BOX_PROPERTY, pickBoxStyles(component.getStyle() as ComponentStyle));
    ensureFreeItemClasses(component);
    component.setDragMode("absolute");
    component.set("resizable", resizeOptionsForComponent(component, options.widgetType));
    const selector = freeItemSelector(component);
    if (!editor.Css.getRule(selector)) {
      const measured = box ?? measureBox(component, root);
      if (measured) updateFreeItemBox(component, interactionKind(component) === "text" ? { x: measured.x, y: measured.y, width: measured.width } : measured);
    }
  };
  const removeFreeItem = (component: Component) => {
    const uniqueClass = getFreeItemClass(component);
    if (uniqueClass) editor.Css.remove(`.movecues-widget .${uniqueClass}`);
    component.setDragMode();
    const resizable = resizeOptionsForComponent(component, options.widgetType);
    if (resizable) component.set("resizable", resizable);
    const currentStyle = component.getStyle() as ComponentStyle;
    component.setStyle(restoreBoxStyles(currentStyle, component.get(FLOW_BOX_PROPERTY) as ComponentStyle | undefined));
    component.set(FLOW_BOX_PROPERTY, undefined);
    const removable = component.getClasses?.().filter(name => name === FREE_LAYOUT_ITEM_CLASS || name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX)) ?? [];
    if (removable.length) component.removeClass(removable);
  };
  const ensureFixedRootHeight = (root: Component) => {
    const size = normalizeWidgetSize(options.widgetType, options.design());
    if (size.height.mode === "fixed") return;
    if (root.get(PREVIOUS_HEIGHT_PROPERTY) === undefined) root.set(PREVIOUS_HEIGHT_PROPERTY, size.height);
    const rootElement = root.getEl?.(); const measuredHeight = clampWidgetHeight(options.widgetType, rootElement?.getBoundingClientRect().height ?? rootElement?.offsetHeight ?? 0).value;
    options.onRootResize({ ...size, height: { mode: "fixed", value: measuredHeight } }, true);
  };
  const restoreRootHeight = (root: Component) => {
    const previous = root.get(PREVIOUS_HEIGHT_PROPERTY) as ExperienceSize["height"] | undefined;
    if (!previous) return;
    options.onRootResize({ ...normalizeWidgetSize(options.widgetType, options.design()), height: previous }, true);
    root.set(PREVIOUS_HEIGHT_PROPERTY, undefined);
  };
  const syncLayoutFromRoot = () => {
    const root = getRoot();
    if (!root) return;
    if (!supported && root.getClasses?.().includes(FREE_LAYOUT_ROOT_CLASS)) { root.removeClass(FREE_LAYOUT_ROOT_CLASS); cleanupGeneratedRules(editor); }
    if (!isFreeLayout()) {
      for (const component of directChildren(root)) if (component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) removeFreeItem(component);
      root.removeClass(FREE_LAYOUT_ROOT_CLASS); if (editor.Css.getRule(ROOT_SELECTOR)) editor.Css.remove(ROOT_SELECTOR); cleanupGeneratedRules(editor); restoreRootHeight(root); selected = null; options.onFreeItemChange?.(null, null); options.onFreeLayoutChange?.(false); return;
    }
    ensureFixedRootHeight(root);
    editor.Css.setRule(ROOT_SELECTOR, { position: "relative" });
    for (const component of directChildren(root)) configureFreeItem(component);
    options.onFreeLayoutChange?.(true); notifySelected();
  };
  const setFreeLayout = (enabled: boolean) => {
    const root = getRoot();
    if (!root || !supported) return;
    if (enabled === isFreeLayout()) { syncLayoutFromRoot(); return; }
    if (enabled) {
      const rootRect = root.getEl?.()?.getBoundingClientRect();
      const children = directChildren(root);
      const boxes = new Map(children.map(component => [component, measureBox(component, root)]));
      if (rootRect) ensureFixedRootHeight(root);
      root.addClass(FREE_LAYOUT_ROOT_CLASS);
      editor.Css.setRule(ROOT_SELECTOR, { position: "relative" });
      for (const component of children) configureFreeItem(component, boxes.get(component) ?? undefined);
      const editorSelection = editor.getSelected?.(); selected = editorSelection && isFreeItem(editorSelection) ? editorSelection : null; notifySelected();
    } else {
      for (const component of directChildren(root)) if (component.getClasses?.().includes(FREE_LAYOUT_ITEM_CLASS)) removeFreeItem(component);
      root.removeClass(FREE_LAYOUT_ROOT_CLASS); if (editor.Css.getRule(ROOT_SELECTOR)) editor.Css.remove(ROOT_SELECTOR); cleanupGeneratedRules(editor); restoreRootHeight(root);
      selected = null; options.onFreeItemChange?.(null, null);
    }
    options.onFreeLayoutChange?.(enabled);
  };
  const syncDraggedItem = (component?: Component) => {
    if (!component || !isFreeItem(component)) return;
    const root = getRoot(); const box = root ? measureBox(component, root) : null;
    if (box) updateFreeItemBox(component, { x: box.x, y: box.y });
    component.setStyle(restoreBoxStyles(component.getStyle() as ComponentStyle, component.get(FLOW_BOX_PROPERTY) as ComponentStyle | undefined));
  };
  const configure = (component: Component) => {
    if (!component) return;
    const kind = interactionKind(component);
    const resizable = resizeOptionsForComponent(component, options.widgetType);
    if (resizable) component.set("resizable", resizable);
    if (kind === "root") return;
    if (isFreeLayout() && component.parent?.() === getRoot()) configureFreeItem(component);
    else component.setDragMode();
  };
  const select = (component?: Component) => { selected = component && isFreeItem(component) ? component : null; notifySelected(); };
  const moveLayer = (component: Component, direction: "forward" | "backward") => {
    const root = getRoot(); if (!root || !isFreeItem(component)) return;
    const currentIndex = component.index();
    const nextIndex = Math.max(0, Math.min(directChildren(root).length - 1, currentIndex + (direction === "forward" ? 1 : -1)));
    if (nextIndex !== currentIndex) component.move(root, { at: nextIndex });
  };

  editor.on("component:create", configure);
  editor.on("component:add", configure);
  editor.on("component:mount", configure);
  editor.on("component:drag:end", ({ target }: { target?: Component }) => syncDraggedItem(target));
  editor.on("component:resize:end", ({ component }: { component: Component }) => syncDraggedItem(component));
  editor.on("component:resize:update", (event: ComponentResizeEventUpdateProps) => {
    if (isFreeItem(event.component)) {
      const current = getFreeItemBox(event.component);
      if (current) {
        const box = { x: numericStyle(event.style.left, current.x), y: numericStyle(event.style.top, current.y), width: event.rect.w };
        updateFreeItemBox(event.component, interactionKind(event.component) === "text" ? box : { ...box, height: event.rect.h });
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

  return { isFreeLayout, setFreeLayout, syncLayoutFromRoot, select, isFreeItem, getFreeItemBox, updateFreeItemBox, moveLayer };
}

function directChildren(root: Component): Component[] {
  const children: Component[] = [];
  root.components()?.forEach((component: Component) => children.push(component));
  return children;
}

function measureBox(component: Component, root: Component): FreeItemBox | null {
  const element = component.getEl?.(); const rootElement = root.getEl?.();
  if (!element || !rootElement) return null;
  const rect = element.getBoundingClientRect(); const rootRect = rootElement.getBoundingClientRect(); const style = component.getStyle() as ComponentStyle;
  return {
    x: numericStyle(style.left, rect.left - rootRect.left),
    y: numericStyle(style.top, rect.top - rootRect.top),
    width: numericStyle(style.width, rect.width || element.offsetWidth),
    height: numericStyle(style.height, rect.height || element.offsetHeight),
  };
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

function getFreeItemClass(component: Component): string | undefined {
  return component.getClasses?.().find(name => name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX));
}

function freeItemSelector(component: Component): string {
  return `.movecues-widget .${getFreeItemClass(component) ?? ensureFreeItemClasses(component)}`;
}

function cleanupGeneratedRules(editor: Editor): void {
  for (const rule of editor.Css.getRules()) {
    const selector = rule.selectorsToString();
    if (selector === ROOT_SELECTOR || selector.includes(`.${FREE_LAYOUT_ITEM_CLASS_PREFIX}`)) editor.Css.remove(rule);
  }
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

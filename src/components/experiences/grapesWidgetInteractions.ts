import type { Component, ComponentResizeEventUpdateProps, Editor, ResizerOptions, StyleProps } from "grapesjs";
import type { ExperienceDesign, ExperienceSize, WidgetType } from "../../types/experiences";
import { clampWidgetHeight, clampWidgetWidth, normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS } from "./widgetSizing";

const FREE_POSITION_PROPERTY = "loopzFreePosition";
const FLOW_POSITION_PROPERTY = "loopzFlowPosition";
const PARENT_CONTEXT_PROPERTY = "loopzFreePositionParentContext";
const PARENT_PREVIOUS_POSITION_PROPERTY = "loopzPreviousPosition";
const POSITION_PROPERTIES = ["position", "top", "right", "bottom", "left", "z-index"] as const;
const GRID_SIZE = 4;

type InteractionKind = "root" | "image" | "text" | "button" | "layout" | "spacer";
type ComponentStyle = StyleProps;

export interface RootResizeResult {
  size: ExperienceSize;
  style: ComponentStyle;
}

interface InteractionOptions {
  widgetType: WidgetType;
  design: () => ExperienceDesign;
  onRootResize: (size: ExperienceSize, commit: boolean) => void;
}

const ALL_HANDLES = { tl: true, tc: true, tr: true, cl: true, cr: true, bl: true, bc: true, br: true };
const WIDTH_HANDLES = { tl: false, tc: false, tr: false, cl: true, cr: true, bl: false, bc: false, br: false };

export function interactionKind(component: Component): InteractionKind | null {
  const classes = new Set(component.getClasses?.() ?? []);
  const tagName = String(component.get?.("tagName") ?? component.getEl?.()?.tagName ?? "").toLowerCase();
  if (classes.has("loopz-widget")) return "root";
  if (tagName === "img" || component.is?.("image")) return "image";
  if (tagName === "button" || classes.has("loopz-widget__button")) return "button";
  if (["h1", "h2", "h3", "h4", "p"].includes(tagName) || classes.has("loopz-widget__heading") || classes.has("loopz-widget__body") || classes.has("loopz-widget__eyebrow")) return "text";
  if (classes.has("loopz-widget__spacer")) return "spacer";
  if (["loopz-widget__container", "loopz-widget__row", "loopz-widget__columns", "loopz-widget__column", "loopz-widget__message", "loopz-widget__actions"].some(name => classes.has(name))) return "layout";
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

export function setFreePosition(component: Component, enabled: boolean): void {
  if (interactionKind(component) === "root") return;
  const parent = component.parent?.();
  const style = component.getStyle() as ComponentStyle;
  if (enabled) {
    if (component.get(FLOW_POSITION_PROPERTY) === undefined) component.set(FLOW_POSITION_PROPERTY, pickPositionStyles(style));
    const element = component.getEl?.();
    const left = element?.offsetLeft ?? 0;
    const top = element?.offsetTop ?? 0;
    if (parent) ensurePositioningContext(parent, component);
    component.setDragMode("absolute");
    component.setStyle({ ...style, position: "absolute", left: style.position === "absolute" && style.left !== undefined ? style.left : `${snap(left)}px`, top: style.position === "absolute" && style.top !== undefined ? style.top : `${snap(top)}px`, right: "auto", bottom: "auto" });
    return;
  }
  component.setDragMode();
  component.setStyle(restorePositionStyles(style, component.get(FLOW_POSITION_PROPERTY) as ComponentStyle | undefined));
  component.set(FLOW_POSITION_PROPERTY, undefined);
  restorePositioningContext(parent, component);
}

export function constrainFreePosition(component: Component): void {
  if (!freePositionEnabled(component)) return;
  const element = component.getEl?.();
  const parentElement = element?.parentElement;
  if (!element || !parentElement || parentElement.clientWidth <= 0 || parentElement.clientHeight <= 0) return;
  const style = component.getStyle() as ComponentStyle;
  const left = numericStyle(style.left, element.offsetLeft);
  const top = numericStyle(style.top, element.offsetTop);
  const maxLeft = Math.max(0, parentElement.clientWidth - element.offsetWidth);
  const maxTop = Math.max(0, parentElement.clientHeight - element.offsetHeight);
  component.setStyle({ ...style, left: `${Math.min(maxLeft, Math.max(0, snap(left)))}px`, top: `${Math.min(maxTop, Math.max(0, snap(top)))}px` });
}

export function installWidgetInteractions(editor: Editor, options: InteractionOptions): void {
  const configured = new WeakSet<Component>();
  const configure = (component: Component) => {
    if (!component || configured.has(component)) return;
    const resizable = resizeOptionsForComponent(component, options.widgetType);
    if (!resizable) return;
    configured.add(component);
    component.set("resizable", resizable);
    if (interactionKind(component) !== "root") {
      if (!component.getTrait(FREE_POSITION_PROPERTY)) component.addTrait([{ type: "checkbox", name: FREE_POSITION_PROPERTY, label: "Free position", changeProp: true }], { at: 0 });
      component.on(`change:${FREE_POSITION_PROPERTY}`, () => setFreePosition(component, freePositionEnabled(component)));
      if (freePositionEnabled(component)) component.setDragMode("absolute");
    }
  };
  editor.on("component:create", configure);
  editor.on("component:add", configure);
  editor.on("component:mount", configure);
  editor.on("component:drag:end", ({ target }: { target?: Component }) => { if (target) constrainFreePosition(target); });
  editor.on("component:resize:end", ({ component }: { component: Component }) => constrainFreePosition(component));
  editor.on("component:resize:update", (event: ComponentResizeEventUpdateProps) => {
    if (interactionKind(event.component) !== "root") return;
    const result = rootResizeResult(options.widgetType, options.design(), event.rect, event.style);
    if (!result) return;
    event.updateStyle(result.style);
    options.onRootResize(result.size, !event.partial);
  });
}

function pickPositionStyles(style: ComponentStyle): ComponentStyle {
  return Object.fromEntries(POSITION_PROPERTIES.filter(property => style[property] !== undefined).map(property => [property, style[property]]));
}

function restorePositionStyles(style: ComponentStyle, previous: ComponentStyle = {}): ComponentStyle {
  const restored = { ...style };
  for (const property of POSITION_PROPERTIES) {
    if (previous[property] === undefined) delete restored[property];
    else restored[property] = previous[property];
  }
  return restored;
}

function ensurePositioningContext(parent: Component, component: Component): void {
  const style = parent.getStyle() as ComponentStyle;
  if (style.position && style.position !== "static") return;
  if (parent.get(PARENT_PREVIOUS_POSITION_PROPERTY) === undefined) parent.set(PARENT_PREVIOUS_POSITION_PROPERTY, style.position ?? "");
  parent.setStyle({ ...style, position: "relative" });
  component.set(PARENT_CONTEXT_PROPERTY, true);
}

function restorePositioningContext(parent: Component | undefined, component: Component): void {
  if (!parent || !component.get(PARENT_CONTEXT_PROPERTY)) return;
  let hasOtherFreeChild = false;
  parent.forEachChild(child => { if (child !== component && freePositionEnabled(child)) hasOtherFreeChild = true; });
  if (!hasOtherFreeChild) {
    const style = { ...(parent.getStyle() as ComponentStyle) };
    const previous = parent.get(PARENT_PREVIOUS_POSITION_PROPERTY) as string | undefined;
    if (previous) style.position = previous;
    else delete style.position;
    parent.setStyle(style);
    parent.set(PARENT_PREVIOUS_POSITION_PROPERTY, undefined);
  }
  component.set(PARENT_CONTEXT_PROPERTY, undefined);
}

function numericStyle(value: ComponentStyle[string] | undefined, fallback: number): number {
  const numeric = Number.parseFloat(typeof value === "string" ? value : "");
  return Number.isFinite(numeric) ? numeric : fallback;
}

function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function freePositionEnabled(component: Component): boolean {
  const value = component.get(FREE_POSITION_PROPERTY);
  return value === true || value === 1 || value === "true";
}

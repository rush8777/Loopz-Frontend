import type { Component, Editor } from "grapesjs";
import { describe, expect, it, vi } from "vitest";
import { validateBuilderCss } from "./widgetBuilder";
import { FREE_LAYOUT_ITEM_CLASS, FREE_LAYOUT_ITEM_CLASS_PREFIX, FREE_LAYOUT_ROOT_CLASS, installWidgetInteractions, interactionKind, resizeOptionsForComponent, rootResizeResult, supportsFreeLayout } from "./grapesWidgetInteractions";

interface Rect { left: number; top: number; width: number; height: number }
interface ComponentFixture { component: Component; element: HTMLElement; children: ComponentFixture[]; values: Map<string, unknown>; classes: () => string[]; style: () => Record<string, string>; dragMode: () => string; setRect: (next: Partial<Rect>) => void }

function componentFixture({ classes = [], tagName = "div", style = {}, rect = { left: 0, top: 0, width: 100, height: 40 }, parent }: { classes?: string[]; tagName?: string; style?: Record<string, string>; rect?: Rect; parent?: ComponentFixture } = {}): ComponentFixture {
  let currentStyle = { ...style }; let dragMode = ""; let currentRect = { ...rect }; const currentClasses = [...classes]; const values = new Map<string, unknown>(); const children: ComponentFixture[] = [];
  const element = document.createElement(tagName);
  Object.defineProperties(element, { offsetLeft: { configurable: true, get: () => currentRect.left }, offsetTop: { configurable: true, get: () => currentRect.top }, offsetWidth: { configurable: true, get: () => currentRect.width }, offsetHeight: { configurable: true, get: () => currentRect.height }, clientWidth: { configurable: true, get: () => currentRect.width }, clientHeight: { configurable: true, get: () => currentRect.height } });
  element.getBoundingClientRect = () => ({ ...currentRect, x: currentRect.left, y: currentRect.top, right: currentRect.left + currentRect.width, bottom: currentRect.top + currentRect.height, toJSON: () => ({}) });
  const fixture = {} as ComponentFixture;
  const component = {
    getClasses: () => [...currentClasses], addClass: (next: string | string[]) => { for (const name of Array.isArray(next) ? next : next.split(/\s+/)) if (name && !currentClasses.includes(name)) currentClasses.push(name); }, removeClass: (next: string | string[]) => { for (const name of Array.isArray(next) ? next : next.split(/\s+/)) { const index = currentClasses.indexOf(name); if (index >= 0) currentClasses.splice(index, 1); } },
    get: (key: string) => key === "tagName" ? tagName : values.get(key), set: (key: string, value: unknown) => { values.set(key, value); }, is: (type: string) => type === "image" && tagName === "img",
    getEl: () => element, getStyle: () => ({ ...currentStyle }), setStyle: (next: Record<string, string>) => { currentStyle = { ...next }; return currentStyle; }, setDragMode: (mode = "") => { dragMode = mode; }, getDragMode: () => dragMode,
    parent: () => parent?.component, components: () => ({ forEach: (callback: (child: Component) => void) => children.forEach(child => callback(child.component)) }), index: () => parent ? parent.children.indexOf(fixture) : 0,
    move: (_destination: Component, options: { at?: number }) => { if (parent && options.at !== undefined) { const from = parent.children.indexOf(fixture); parent.children.splice(from, 1); parent.children.splice(options.at, 0, fixture); } },
    getAttributes: () => ({ "data-movecues-action-id": "primary" }),
  } as unknown as Component;
  Object.assign(fixture, { component, element, children, values, classes: () => [...currentClasses], style: () => currentStyle, dragMode: () => dragMode, setRect: (next: Partial<Rect>) => { currentRect = { ...currentRect, ...next }; } });
  if (parent) { parent.children.push(fixture); parent.element.appendChild(element); }
  return fixture;
}

function editorFixture(root: ReturnType<typeof componentFixture>) {
  const handlers = new Map<string, (...args: any[]) => void>(); const rules = new Map<string, { selector: string; style: Record<string, string>; getStyle: () => Record<string, string>; selectorsToString: () => string }>();
  const Css = {
    setRule: vi.fn((selector: string, style: Record<string, string>) => { const rule = { selector, style: { ...style }, getStyle: () => ({ ...rule.style }), selectorsToString: () => selector }; rules.set(selector, rule); return rule; }),
    getRule: vi.fn((selector: string) => rules.get(selector)), getRules: vi.fn(() => [...rules.values()]), remove: vi.fn((target: string | { selector: string }) => { rules.delete(typeof target === "string" ? target : target.selector); }),
  };
  const editor = { Css, getWrapper: () => ({ find: (selector: string) => selector === ".movecues-widget" ? [root.component] : [] }), on: (name: string, handler: (...args: any[]) => void) => handlers.set(name, handler) } as unknown as Editor;
  return { editor, handlers, rules, css: () => [...rules.values()].map(rule => `${rule.selector}{${Object.entries(rule.style).map(([key, value]) => `${key}:${value}`).join(";")}}`).join("") };
}

const design = { width: "md" as const, theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" as const } };

describe("GrapesJS widget interactions", () => {
  it("provides constrained resize handles for the root and builder components", () => {
    expect(supportsFreeLayout("modal")).toBe(true); expect(supportsFreeLayout("slideout")).toBe(true); expect(supportsFreeLayout("toast")).toBe(false);
    const root = componentFixture({ classes: ["movecues-widget"] }).component; const image = componentFixture({ tagName: "img" }).component; const text = componentFixture({ classes: ["movecues-widget__body"], tagName: "p" }).component; const divider = componentFixture({ classes: ["movecues-widget__divider"], tagName: "hr" }).component;
    expect(resizeOptionsForComponent(root, "modal")).toMatchObject({ tl: true, br: true, minDim: 200, maxDim: 960 }); expect(interactionKind(image)).toBe("image"); expect(resizeOptionsForComponent(image, "modal")).toMatchObject({ ratioDefault: true, tl: true, br: true }); expect(resizeOptionsForComponent(text, "modal")).toMatchObject({ cl: true, cr: true, tl: false, bc: false }); expect(resizeOptionsForComponent(divider, "modal")).toMatchObject({ tl: true, br: true });
    expect(resizeOptionsForComponent(root, "toast")).toMatchObject({ cl: true, cr: true, tl: false, minDim: 280, maxDim: 520 }); expect(resizeOptionsForComponent(componentFixture({ classes: ["movecues-widget"] }).component, "banner")).toBe(false);
  });

  it("keeps existing root sizing clamps available while the root is resizable", () => {
    expect(rootResizeResult("modal", design, { w: 1400, h: 1200 }, { width: "1400px", height: "1200px" })).toEqual({ size: { width: { mode: "fixed", value: 960 }, height: { mode: "fixed", value: 900 } }, style: { width: "960px", height: "900px" } });
    expect(rootResizeResult("toast", design, { w: 460, h: 180 }, { width: "460px" })?.size).toEqual({ width: { mode: "fixed", value: 460 }, height: { mode: "auto" } });
  });

  it("leaves direct and nested components in normal GrapesJS flow in Auto mode", () => {
    const root = componentFixture({ classes: ["movecues-widget"] }); const child = componentFixture({ classes: ["movecues-widget__body"], tagName: "p", parent: root }); const container = componentFixture({ classes: ["movecues-widget__container"], parent: root }); const nested = componentFixture({ classes: ["movecues-widget__body"], tagName: "p", parent: container }); const harness = editorFixture(root); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => design, onRootResize: vi.fn() }); harness.handlers.get("component:add")?.(root.component); harness.handlers.get("component:add")?.(child.component); harness.handlers.get("component:add")?.(nested.component);
    expect(controller.isFreeLayout()).toBe(false); expect(root.values.get("resizable")).toMatchObject({ tl: true, br: true }); expect(child.values.get("resizable")).toMatchObject({ cl: true, cr: true }); expect(nested.values.get("resizable")).toMatchObject({ cl: true, cr: true }); expect(child.dragMode()).toBe(""); expect(nested.dragMode()).toBe(""); expect(child.classes()).not.toContain(FREE_LAYOUT_ITEM_CLASS); expect(harness.rules.size).toBe(0);
  });

  it("converts direct children without visual jumps and fixes an automatic root height", () => {
    const root = componentFixture({ classes: ["movecues-widget"], rect: { left: 100, top: 50, width: 600, height: 360 } }); const child = componentFixture({ classes: ["movecues-widget__body"], tagName: "p", rect: { left: 140, top: 90, width: 220, height: 60 }, parent: root }); const container = componentFixture({ classes: ["movecues-widget__container"], rect: { left: 180, top: 180, width: 300, height: 120 }, parent: root }); const nested = componentFixture({ classes: ["movecues-widget__body"], tagName: "p", parent: container });
    const harness = editorFixture(root); const onRootResize = vi.fn(); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => design, onRootResize }); harness.handlers.get("component:mount")?.(root.component); controller.setFreeLayout(true);
    expect(root.classes()).toContain(FREE_LAYOUT_ROOT_CLASS); expect(root.values.get("resizable")).toMatchObject({ tl: true, br: true }); expect(onRootResize).toHaveBeenCalledWith({ width: { mode: "fixed", value: 600 }, height: { mode: "fixed", value: 360 } }, true);
    expect(child.dragMode()).toBe("absolute"); expect(child.values.get("resizable")).toMatchObject({ cl: true, cr: true }); expect(container.dragMode()).toBe("absolute"); expect(container.values.get("resizable")).toMatchObject({ tl: true, br: true }); expect(nested.dragMode()).toBe(""); expect(child.classes()).toContain(FREE_LAYOUT_ITEM_CLASS); expect(child.classes().some(name => name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX))).toBe(true);
    const box = controller.getFreeItemBox(child.component); expect(box).toMatchObject({ x: 40, y: 40, width: 220, height: 60 }); expect(validateBuilderCss(harness.css())).toContain(".movecues-widget .movecues-free-item--");
    const stableClass = child.classes().find(name => name.startsWith(FREE_LAYOUT_ITEM_CLASS_PREFIX)); controller.setFreeLayout(true); expect(child.classes()).toContain(stableClass); controller.setFreeLayout(false); expect(onRootResize).toHaveBeenLastCalledWith({ width: { mode: "fixed", value: 600 }, height: { mode: "auto" } }, true);
  });

  it("keeps fixed widget heights and restores only generated positioning in Auto mode", () => {
    const fixedDesign = { ...design, size: { width: { mode: "fixed" as const, value: 600 }, height: { mode: "fixed" as const, value: 480 } } }; const root = componentFixture({ classes: ["movecues-widget"], rect: { left: 0, top: 0, width: 600, height: 480 } }); const child = componentFixture({ classes: ["movecues-widget__button"], tagName: "button", style: { color: "red", width: "50%" }, rect: { left: 20, top: 30, width: 200, height: 44 }, parent: root });
    const harness = editorFixture(root); const onRootResize = vi.fn(); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => fixedDesign, onRootResize }); controller.setFreeLayout(true); expect(onRootResize).not.toHaveBeenCalled(); controller.updateFreeItemBox(child.component, { x: 120, y: 80, width: 240, height: 52 }); controller.setFreeLayout(false);
    expect(root.classes()).not.toContain(FREE_LAYOUT_ROOT_CLASS); expect(child.classes()).not.toContain(FREE_LAYOUT_ITEM_CLASS); expect(child.style()).toEqual({ color: "red", width: "50%" }); expect(child.dragMode()).toBe(""); expect(child.values.get("resizable")).toMatchObject({ tl: true, br: true }); expect(harness.rules.size).toBe(0);
  });

  it("uses one scoped CSS rule for inspector edits, dragging, and resizing", () => {
    const root = componentFixture({ classes: ["movecues-widget"], rect: { left: 10, top: 10, width: 600, height: 500 } }); const child = componentFixture({ classes: ["movecues-widget__button"], tagName: "button", rect: { left: 30, top: 40, width: 120, height: 40 }, parent: root }); const harness = editorFixture(root); const onFreeItemChange = vi.fn(); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => ({ ...design, size: { width: { mode: "fixed", value: 600 }, height: { mode: "fixed", value: 500 } } }), onRootResize: vi.fn(), onFreeItemChange });
    controller.setFreeLayout(true); controller.select(child.component); controller.updateFreeItemBox(child.component, { x: 88, y: 76, width: 180, height: 48 }); expect(controller.getFreeItemBox(child.component)).toEqual({ x: 88, y: 76, width: 180, height: 48 }); expect(onFreeItemChange).toHaveBeenLastCalledWith(child.component, { x: 88, y: 76, width: 180, height: 48 });
    child.setRect({ left: 150, top: 120 }); harness.handlers.get("component:drag:end")?.({ target: child.component }); expect(controller.getFreeItemBox(child.component)).toMatchObject({ x: 140, y: 110 });
    const updateStyle = vi.fn(); harness.handlers.get("component:resize:update")?.({ component: child.component, rect: { w: 210, h: 56 }, style: { left: "140px", top: "110px" }, updateStyle }); expect(updateStyle).toHaveBeenCalledWith({}); expect(controller.getFreeItemBox(child.component)).toMatchObject({ width: 210, height: 56 }); expect(validateBuilderCss(harness.css())).toBe(harness.css());
  });

  it("restores saved Free mode, converts new direct blocks, and leaves nested blocks in flow", () => {
    const root = componentFixture({ classes: ["movecues-widget", FREE_LAYOUT_ROOT_CLASS], rect: { left: 0, top: 0, width: 600, height: 500 } }); const saved = componentFixture({ classes: [FREE_LAYOUT_ITEM_CLASS, `${FREE_LAYOUT_ITEM_CLASS_PREFIX}saved`], rect: { left: 20, top: 30, width: 120, height: 40 }, parent: root }); const container = componentFixture({ classes: ["movecues-widget__container"], parent: root }); const harness = editorFixture(root); harness.editor.Css.setRule(".movecues-widget .movecues-free-item--saved", { position: "absolute", left: "44px", top: "52px", width: "160px", height: "48px" }); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => design, onRootResize: vi.fn() }); controller.syncLayoutFromRoot();
    expect(controller.isFreeLayout()).toBe(true); expect(saved.dragMode()).toBe("absolute"); expect(controller.getFreeItemBox(saved.component)).toEqual({ x: 44, y: 52, width: 160, height: 48 });
    const direct = componentFixture({ classes: ["movecues-widget__divider"], tagName: "hr", rect: { left: 70, top: 100, width: 300, height: 2 }, parent: root }); harness.handlers.get("component:add")?.(direct.component); expect(direct.classes()).toContain(FREE_LAYOUT_ITEM_CLASS); expect(direct.dragMode()).toBe("absolute"); expect(controller.getFreeItemBox(direct.component)).toMatchObject({ x: 70, y: 100 });
    const nested = componentFixture({ classes: ["movecues-widget__body"], tagName: "p", parent: container }); harness.handlers.get("component:add")?.(nested.component); expect(nested.classes()).not.toContain(FREE_LAYOUT_ITEM_CLASS); expect(nested.dragMode()).toBe("");
  });

  it("persists layer ordering through component order", () => {
    const root = componentFixture({ classes: ["movecues-widget"], rect: { left: 0, top: 0, width: 600, height: 500 } }); const first = componentFixture({ parent: root }); const second = componentFixture({ parent: root }); const harness = editorFixture(root); const controller = installWidgetInteractions(harness.editor, { widgetType: "modal", design: () => design, onRootResize: vi.fn() }); controller.setFreeLayout(true); controller.moveLayer(first.component, "forward"); expect(root.children).toEqual([second, first]); controller.moveLayer(first.component, "backward"); expect(root.children).toEqual([first, second]);
  });
});

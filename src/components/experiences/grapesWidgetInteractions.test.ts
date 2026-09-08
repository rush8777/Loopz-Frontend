import type { Component, Editor } from "grapesjs";
import { describe, expect, it, vi } from "vitest";
import { installWidgetInteractions, interactionKind, resizeOptionsForComponent, rootResizeResult, setFreePosition } from "./grapesWidgetInteractions";

function componentFixture({ classes = [], tagName = "div", style = {}, parent }: { classes?: string[]; tagName?: string; style?: Record<string, string>; parent?: Component } = {}) {
  let currentStyle = { ...style }; let dragMode = ""; const values = new Map<string, unknown>(); const traits: Array<{ name: string }> = []; const listeners = new Map<string, () => void>();
  const element = document.createElement(tagName); Object.defineProperties(element, { offsetLeft: { configurable: true, value: 13 }, offsetTop: { configurable: true, value: 18 } });
  const component = {
    getClasses: () => classes,
    get: (key: string) => key === "tagName" ? tagName : values.get(key),
    set: (key: string, value: unknown) => { values.set(key, value); },
    is: (type: string) => type === "image" && tagName === "img",
    getEl: () => element,
    getStyle: () => ({ ...currentStyle }),
    setStyle: (next: Record<string, string>) => { currentStyle = { ...next }; return currentStyle; },
    setDragMode: (mode = "") => { dragMode = mode; },
    getTrait: (name: string) => traits.find(trait => trait.name === name),
    addTrait: (next: Array<{ name: string }>) => { traits.push(...next); },
    on: (name: string, listener: () => void) => { listeners.set(name, listener); },
    parent: () => parent,
    forEachChild: () => undefined,
    getAttributes: () => ({ "data-movecues-action-id": "primary" }),
  } as unknown as Component;
  return { component, style: () => currentStyle, dragMode: () => dragMode, traits, values, listeners };
}

const design = { width: "md" as const, theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" as const } };

describe("GrapesJS widget interactions", () => {
  it("assigns capability-specific resize handles to images, containers, and text", () => {
    const image = componentFixture({ tagName: "img" }).component;
    const container = componentFixture({ classes: ["movecues-widget__container"] }).component;
    const text = componentFixture({ classes: ["movecues-widget__body"], tagName: "p" }).component;
    expect(interactionKind(image)).toBe("image"); expect(resizeOptionsForComponent(image, "modal")).toMatchObject({ ratioDefault: true, tl: true, br: true, minDim: 24 });
    expect(resizeOptionsForComponent(container, "modal")).toMatchObject({ tl: true, bc: true, br: true });
    expect(resizeOptionsForComponent(text, "modal")).toMatchObject({ cl: true, cr: true, tl: false, bc: false });
  });

  it("routes root width and height through existing widget clamps", () => {
    const root = componentFixture({ classes: ["movecues-widget"] }).component;
    expect(resizeOptionsForComponent(root, "modal")).toMatchObject({ tl: true, br: true });
    expect(rootResizeResult("modal", design, { w: 1400, h: 1200 }, { width: "1400px", height: "1200px" })).toEqual({ size: { width: { mode: "fixed", value: 960 }, height: { mode: "fixed", value: 900 } }, style: { width: "960px", height: "900px" } });
  });

  it("keeps auto-height widgets automatic when only their width is resized", () => {
    expect(rootResizeResult("toast", design, { w: 460, h: 180 }, { width: "460px" })?.size).toEqual({ width: { mode: "fixed", value: 460 }, height: { mode: "auto" } });
  });

  it("enables and safely restores free positioning without changing action attributes", () => {
    const parentFixture = componentFixture({ style: {} });
    const button = componentFixture({ classes: ["movecues-widget__button"], tagName: "button", style: { color: "red" }, parent: parentFixture.component });
    setFreePosition(button.component, true);
    expect(button.dragMode()).toBe("absolute"); expect(button.style()).toMatchObject({ color: "red", position: "absolute", left: "12px", top: "20px" }); expect(parentFixture.style().position).toBe("relative"); expect(button.component.getAttributes()["data-movecues-action-id"]).toBe("primary");
    setFreePosition(button.component, false);
    expect(button.dragMode()).toBe(""); expect(button.style()).toEqual({ color: "red" }); expect(parentFixture.style().position).toBeUndefined(); expect(button.component.getAttributes()["data-movecues-action-id"]).toBe("primary");
  });

  it("adds Free position while leaving normal responsive dragging as the default", () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const editor = { on: (name: string, handler: (...args: any[]) => void) => { handlers.set(name, handler); } } as unknown as Editor;
    const button = componentFixture({ classes: ["movecues-widget__button"], tagName: "button" });
    installWidgetInteractions(editor, { widgetType: "modal", design: () => design, onRootResize: vi.fn() });
    handlers.get("component:create")?.(button.component);
    expect(button.values.get("resizable")).toMatchObject({ tl: true, br: true }); expect(button.traits).toContainEqual(expect.objectContaining({ name: "movecuesFreePosition" })); expect(button.dragMode()).toBe("");
  });
});

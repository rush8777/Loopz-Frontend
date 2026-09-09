import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { GrapesWidgetBuilder, type GrapesWidgetBuilderHandle } from "./GrapesWidgetBuilder";

const harness = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => void>(), init: vi.fn(), destroy: vi.fn(), dirty: 0 }));
vi.mock("grapesjs", () => ({ default: { init: harness.init } }));

function fakeEditor() {
  let html = '<section class="movecues-widget"><h2 data-movecues-content="heading">Hello</h2><p data-movecues-content="body">World</p></section>'; let css = ".movecues-widget{color:#111}"; let device = "Desktop"; const widgetElement = document.createElement("section"); const childElement = document.createElement("p"); widgetElement.appendChild(childElement); const canvasDocument = document.implementation.createHTMLDocument(); const frameElement = document.createElement("iframe"); const rootClasses = ["movecues-widget"]; const childClasses = ["movecues-widget__body"]; const rootValues = new Map<string, unknown>(); const childValues = new Map<string, unknown>(); let childStyle: Record<string, string> = {}; let childDragMode = "";
  canvasDocument.body.appendChild(widgetElement); Object.defineProperties(widgetElement, { offsetWidth: { configurable: true, value: 600 }, offsetHeight: { configurable: true, value: 320 }, clientWidth: { configurable: true, value: 600 }, clientHeight: { configurable: true, value: 320 } }); Object.defineProperties(childElement, { offsetLeft: { configurable: true, value: 30 }, offsetTop: { configurable: true, value: 40 }, offsetWidth: { configurable: true, value: 220 }, offsetHeight: { configurable: true, value: 60 } }); widgetElement.getBoundingClientRect = () => ({ left: 100, top: 50, width: widgetElement.offsetWidth, height: widgetElement.offsetHeight, right: 100 + widgetElement.offsetWidth, bottom: 50 + widgetElement.offsetHeight, x: 100, y: 50, toJSON: () => ({}) }); childElement.getBoundingClientRect = () => ({ left: 130, top: 90, width: childElement.offsetWidth, height: childElement.offsetHeight, right: 130 + childElement.offsetWidth, bottom: 90 + childElement.offsetHeight, x: 130, y: 90, toJSON: () => ({}) });
  const addClasses = (current: string[], next: string | string[]) => { for (const name of Array.isArray(next) ? next : next.split(/\s+/)) if (name && !current.includes(name)) current.push(name); }; const removeClasses = (current: string[], next: string | string[]) => { for (const name of Array.isArray(next) ? next : next.split(/\s+/)) { const index = current.indexOf(name); if (index >= 0) current.splice(index, 1); } };
  const child: any = { getClasses: () => [...childClasses], addClass: (next: string | string[]) => addClasses(childClasses, next), removeClass: (next: string | string[]) => removeClasses(childClasses, next), get: (key: string) => key === "tagName" ? "p" : childValues.get(key), set: (key: string, next: unknown) => childValues.set(key, next), getEl: () => childElement, getStyle: () => ({ ...childStyle }), setStyle: (next: Record<string, string>) => { childStyle = { ...next }; }, setDragMode: (mode = "") => { childDragMode = mode; }, parent: () => root, is: () => false, index: () => 0, move: vi.fn(), getAttributes: () => ({}) };
  const root: any = { getClasses: () => [...rootClasses], addClass: (next: string | string[]) => addClasses(rootClasses, next), removeClass: (next: string | string[]) => removeClasses(rootClasses, next), get: (key: string) => key === "tagName" ? "section" : rootValues.get(key), set: (key: string, next: unknown) => rootValues.set(key, next), getEl: () => widgetElement, components: () => ({ length: 1, forEach: (callback: (component: any) => void) => callback(child) }), getAttributes: () => ({}) };
  const rules = new Map<string, any>(); const Css = { setRule: vi.fn((selector: string, style: Record<string, string>) => { const rule = { selector, style: { ...style }, getStyle: () => ({ ...rule.style }), selectorsToString: () => selector }; rules.set(selector, rule); return rule; }), getRule: vi.fn((selector: string) => rules.get(selector)), getRules: vi.fn(() => [...rules.values()]), remove: vi.fn((target: string | { selector: string }) => rules.delete(typeof target === "string" ? target : target.selector)) };
  const editor: any = {
    DomComponents: { addType: vi.fn() }, Css, UndoManager: { undo: vi.fn(), redo: vi.fn(), start: vi.fn(), stop: vi.fn(), isTracking: vi.fn(() => true) }, Canvas: { setZoom: vi.fn(), setCoords: vi.fn(), getDocument: vi.fn(() => canvasDocument), getFrameEl: vi.fn(() => frameElement) }, refresh: vi.fn(),
    on: vi.fn((name: string, handler: (...args: any[]) => void) => { const previous = harness.handlers.get(name); harness.handlers.set(name, previous ? (...args: any[]) => { previous(...args); handler(...args); } : handler); }), onReady: vi.fn((handler: () => void) => window.setTimeout(handler, 0)), destroy: harness.destroy,
    getHtml: vi.fn(() => html.replace(/class="movecues-widget[^"]*"/, `class="${rootClasses.join(" ")}"`).replace(/class="movecues-widget__body[^"]*"/, `class="${childClasses.join(" ")}"`)), getCss: vi.fn((options?: { avoidProtected?: boolean }) => { const generated = [...rules.values()].map(rule => `${rule.selector}{${Object.entries(rule.style).map(([key, value]) => `${key}:${value}`).join(";")}}`).join(""); return options?.avoidProtected ? `${css}${generated}` : `*{box-sizing:border-box}body{margin:0}${css}${generated}`; }), getProjectData: vi.fn(() => ({ pages: [] })), getDirtyCount: vi.fn(() => harness.dirty), clearDirtyCount: vi.fn(), setDevice: vi.fn((name: string) => { device = name; }), getDevice: vi.fn(() => device), getSelected: vi.fn(() => child), select: vi.fn(), setComponents: vi.fn((value: string) => { html = value; const parsed = new DOMParser().parseFromString(value, "text/html"); const parsedRoot = parsed.querySelector(".movecues-widget"); rootClasses.splice(0, rootClasses.length, ...(parsedRoot ? [...parsedRoot.classList] : ["movecues-widget"])); }), setStyle: vi.fn((value: string) => { css = value; }), getWrapper: vi.fn(() => ({ find: vi.fn((selector: string) => selector === ".movecues-widget" ? [root] : []), components: vi.fn(() => ({ length: 0 })) })), __root: root, __child: child, __rules: rules, __childDragMode: () => childDragMode,
  };
  harness.init.mockImplementation((config: any) => { config.plugins?.forEach((plugin: any) => plugin(editor)); return editor; }); return editor;
}

describe("GrapesWidgetBuilder", () => {
  afterEach(() => { harness.handlers.clear(); harness.init.mockReset(); harness.destroy.mockReset(); harness.dirty = 0; vi.useRealTimers(); });
  it("initializes once, mounts custom managers, bootstraps once, and destroys cleanly", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); const props = { experienceKey: "exp:v1", widgetType: "modal" as const, content: { heading: "Hello", body: "World" }, design: { width: "md" as const, theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" as const } }, onChange, onPrimaryActionChange: vi.fn(), onSizeChange: vi.fn() };
    const view = render(<GrapesWidgetBuilder {...props} />); await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); });
    expect(harness.init).toHaveBeenCalledTimes(1); const config = harness.init.mock.calls[0][0]; expect(config.storageManager).toBe(false); expect(config.blockManager.appendTo).toBeInstanceOf(HTMLElement); expect(config.traitManager.appendTo).toBeInstanceOf(HTMLElement); expect(config.styleManager.appendTo).toBeInstanceOf(HTMLElement); expect(config.blockManager.appendTo.closest("[role=tabpanel]")?.id).toBe("movecues-builder-blocks-panel"); expect(config.traitManager.appendTo.closest("[role=tabpanel]")?.id).toBe("movecues-builder-properties-panel"); expect(config.styleManager.appendTo.closest("[role=tabpanel]")?.id).toBe("movecues-builder-properties-panel"); expect(editor.setComponents).toHaveBeenCalledWith(expect.stringContaining('data-movecues-widget-type="modal"')); expect(onChange).toHaveBeenCalledTimes(1); expect(onChange.mock.calls[0][0].builder.projectData).toEqual({ pages: [] });
    fireEvent.click(screen.getByRole("button", { name: "Undo" })); fireEvent.click(screen.getByRole("button", { name: "Redo" })); expect(editor.UndoManager.undo).toHaveBeenCalledTimes(1); expect(editor.UndoManager.redo).toHaveBeenCalledTimes(1);
    view.rerender(<GrapesWidgetBuilder {...props} content={{ heading: "Changed externally", body: "World" }} />); expect(harness.init).toHaveBeenCalledTimes(1); view.unmount(); expect(harness.destroy).toHaveBeenCalledTimes(1);
  });

  it("exports only dirty project mutations after the builder debounce", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v2" widgetType="banner" value={{ version: 1, projectData: { pages: [] }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); }); expect(onChange).not.toHaveBeenCalled(); expect(harness.init.mock.calls[0][0]).not.toHaveProperty("projectData"); expect(harness.init.mock.calls[0][0].components).toContain("movecues-widget"); editor.refresh.mockClear(); editor.Canvas.setZoom.mockClear(); editor.Canvas.setCoords.mockClear(); harness.dirty = 1; act(() => harness.handlers.get("update")?.()); act(() => vi.advanceTimersByTime(20)); expect(editor.refresh).not.toHaveBeenCalled(); expect(editor.Canvas.setZoom).not.toHaveBeenCalled(); expect(editor.Canvas.setCoords).not.toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(380)); expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("applies sanitized HTML and scoped CSS from code mode exactly once", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v3" widgetType="toast" value={{ version: 1, projectData: { pages: [] }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); }); const canvas = document.querySelector(".movecues-builder-editor"); fireEvent.click(screen.getByRole("button", { name: "Toggle HTML and CSS editor" })); expect(screen.getByLabelText("Builder CSS")).not.toHaveValue(expect.stringContaining("body{")); fireEvent.change(screen.getByLabelText("Builder HTML"), { target: { value: '<section class="movecues-widget"><script>alert(1)</script><p data-movecues-content="body">Safe</p></section>' } }); fireEvent.change(screen.getByLabelText("Builder CSS"), { target: { value: ".movecues-widget p{color:blue}" } }); fireEvent.click(screen.getByRole("button", { name: "Apply HTML and CSS" })); expect(onChange).toHaveBeenCalledTimes(1); expect(onChange.mock.calls[0][0].builder.html).not.toContain("script"); expect(onChange.mock.calls[0][0].builder.css).toContain(".movecues-widget"); fireEvent.click(screen.getByRole("button", { name: "Toggle HTML and CSS editor" })); act(() => vi.runOnlyPendingTimers()); expect(document.querySelector(".movecues-builder-editor")).toBe(canvas); expect(harness.init).toHaveBeenCalledTimes(1); expect(editor.refresh).toHaveBeenCalled();
  });

  it("flushes a pending canvas mutation without waiting for the debounce", async () => {
    vi.useFakeTimers(); fakeEditor(); const onChange = vi.fn(); const ref = createRef<GrapesWidgetBuilderHandle>(); render(<GrapesWidgetBuilder ref={ref} experienceKey="exp:v4" widgetType="modal" value={{ version: 1, projectData: { original: true }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); }); harness.dirty = 1; act(() => harness.handlers.get("update")?.()); act(() => ref.current?.flush()); expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("uses a neutral authoring surface and fits the widget inside the visible workspace", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:v5" widgetType="modal" value={{ version: 1, projectData: { pages: [] }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    const canvas = document.querySelector<HTMLElement>(".movecues-builder-editor");
    expect(canvas).not.toBeNull();
    Object.defineProperties(canvas!, { clientWidth: { configurable: true, value: 720 }, clientHeight: { configurable: true, value: 560 } });
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const devices = harness.init.mock.calls[0][0].deviceManager.devices;
    expect(devices.map((entry: { width: string; height: string }) => [entry.width, entry.height])).toEqual([["1200px", "900px"], ["1200px", "900px"], ["1200px", "900px"]]);
    expect(harness.init.mock.calls[0][0].canvasCss).toContain("min-width:1200px"); expect(harness.init.mock.calls[0][0].canvasCss).toContain("min-height:900px");
    expect(editor.Canvas.setZoom).toHaveBeenCalledWith(100);
    expect(editor.Canvas.setCoords).toHaveBeenCalledWith(-240, 0);
    const widget = editor.getWrapper().find(".movecues-widget")[0].getEl();
    Object.defineProperties(widget, { offsetWidth: { configurable: true, value: 900 }, offsetHeight: { configurable: true, value: 700 } });
    fireEvent.click(screen.getByRole("button", { name: /Mobile/ }));
    act(() => vi.runAllTimers());
    expect(editor.setDevice).toHaveBeenLastCalledWith("Mobile");
    expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(expect.closeTo(66.29, 1));
    expect(editor.Canvas.setCoords).toHaveBeenLastCalledWith(expect.closeTo(-37.71, 1), 0);
  });

  it("pans with the Hand tool, preserves the viewport on updates, and resets it only with Fit", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:viewport" widgetType="modal" value={{ version: 1, projectData: { pages: [] }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    const editorElement = document.querySelector<HTMLElement>(".movecues-builder-editor")!; Object.defineProperties(editorElement, { clientWidth: { configurable: true, value: 720 }, clientHeight: { configurable: true, value: 560 } });
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(110); expect(screen.getByLabelText("Zoom percentage")).toHaveTextContent("110%");
    fireEvent.click(screen.getByRole("button", { name: "Hand tool" })); const panLayer = document.querySelector<HTMLElement>(".movecues-builder-pan-layer")!; expect(panLayer).toHaveClass("movecues-builder-pan-layer--active");
    fireEvent.pointerDown(panLayer, { button: 0, pointerId: 7, clientX: 100, clientY: 100 }); fireEvent.pointerMove(panLayer, { pointerId: 7, clientX: 140, clientY: 160 }); fireEvent.pointerUp(panLayer, { pointerId: 7 });
    expect(editor.Canvas.setCoords).toHaveBeenLastCalledWith(-260, 32);
    editor.Canvas.setZoom.mockClear(); editor.Canvas.setCoords.mockClear(); harness.dirty = 1; act(() => harness.handlers.get("update")?.());
    expect(editor.Canvas.setZoom).not.toHaveBeenCalled(); expect(editor.Canvas.setCoords).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fit" })); act(() => vi.runAllTimers()); expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(100); expect(editor.Canvas.setCoords).toHaveBeenLastCalledWith(-240, 0); expect(screen.getByLabelText("Zoom percentage")).toHaveTextContent("100%");
  });

  it("zooms toward the cursor, ignores normal wheel events, and clamps toolbar zoom", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:zoom" widgetType="modal" value={{ version: 1, projectData: { pages: [] }, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    const editorElement = document.querySelector<HTMLElement>(".movecues-builder-editor")!; Object.defineProperties(editorElement, { clientWidth: { configurable: true, value: 720 }, clientHeight: { configurable: true, value: 560 } });
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); }); const viewport = document.querySelector<HTMLElement>(".movecues-builder-canvas")!;
    editor.Canvas.setZoom.mockClear(); editor.Canvas.setCoords.mockClear(); fireEvent.wheel(viewport, { deltaY: -100, clientX: 100, clientY: 80 }); expect(editor.Canvas.setZoom).not.toHaveBeenCalled();
    fireEvent.wheel(viewport, { deltaY: -100, clientX: 100, clientY: 80, ctrlKey: true }); expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(expect.closeTo(122.14, 2)); expect(editor.Canvas.setCoords).toHaveBeenLastCalledWith(expect.closeTo(-315.28, 2), expect.closeTo(-17.71, 2));
    for (let index = 0; index < 20; index += 1) fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(200); expect(screen.getByLabelText("Zoom percentage")).toHaveTextContent("200%");
    for (let index = 0; index < 30; index += 1) fireEvent.click(screen.getByRole("button", { name: "Zoom out" })); expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(25); expect(screen.getByLabelText("Zoom percentage")).toHaveTextContent("25%");
  });

  it("uses Space as a temporary Hand tool without intercepting editable fields", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:space" widgetType="modal" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); }); const panLayer = document.querySelector<HTMLElement>(".movecues-builder-pan-layer")!;
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }))); expect(panLayer).toHaveClass("movecues-builder-pan-layer--active"); fireEvent.pointerDown(panLayer, { button: 0, pointerId: 3, clientX: 20, clientY: 30 }); fireEvent.pointerMove(panLayer, { pointerId: 3, clientX: 70, clientY: 90 }); expect(document.querySelector(".movecues-builder-canvas")).toHaveClass("movecues-builder-canvas--panning"); act(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }))); expect(panLayer).not.toHaveClass("movecues-builder-pan-layer--active"); expect(document.querySelector(".movecues-builder-canvas")).not.toHaveClass("movecues-builder-canvas--panning");
    const widthInput = screen.getByLabelText("Widget width"); fireEvent.keyDown(widthInput, { code: "Space" }); expect(panLayer).not.toHaveClass("movecues-builder-pan-layer--active");
    const editable = editor.Canvas.getDocument().createElement("div"); editable.setAttribute("contenteditable", "true"); editor.Canvas.getDocument().body.appendChild(editable); act(() => editable.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }))); expect(panLayer).not.toHaveClass("movecues-builder-pan-layer--active");
    fireEvent.click(screen.getByRole("button", { name: "Toggle HTML and CSS editor" })); fireEvent.keyDown(screen.getByLabelText("Builder HTML"), { code: "Space" }); expect(panLayer).not.toHaveClass("movecues-builder-pan-layer--active");
  });

  it("registers the Free Area block without exposing the old global layout toggle", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:free-area-block" widgetType="modal" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />); await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); }); const config = harness.init.mock.calls[0][0]; expect(config.blockManager.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "free-area", label: "Free Area", category: "Layout" })])); expect(editor.DomComponents.addType).toHaveBeenCalledWith("movecues-free-area", expect.any(Object)); expect(screen.queryByRole("group", { name: "Layout mode" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Free" })).not.toBeInTheDocument();
  });

  it("clamps size input and explains the active widget limit", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onSizeChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v6" widgetType="toast" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={onSizeChange} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const width = screen.getByLabelText("Widget width"); expect(width).toHaveValue(380); fireEvent.change(width, { target: { value: "500" } }); expect(editor.Canvas.getDocument().head.querySelector("style[data-movecues-size-envelope]")?.textContent).toContain("width:500px!important"); expect(onSizeChange).not.toHaveBeenCalled(); fireEvent.change(width, { target: { value: "900" } }); fireEvent.blur(width);
    expect(width).toHaveValue(520); expect(screen.getByText("Maximum width for Toast is 520px.")).toBeInTheDocument(); expect(onSizeChange).toHaveBeenCalledWith({ width: { mode: "fixed", value: 520 }, height: { mode: "auto" } });
  });

  it("keeps manager targets mounted while switching sidebar tabs and opens Properties on selection", async () => {
    vi.useFakeTimers(); fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:v7" widgetType="modal" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const config = harness.init.mock.calls[0][0]; const managerTargets = [config.blockManager.appendTo, config.traitManager.appendTo, config.styleManager.appendTo] as HTMLElement[];
    const blocksTab = screen.getByRole("tab", { name: "Blocks" }); const propertiesTab = screen.getByRole("tab", { name: "Properties" });
    expect(blocksTab).toHaveAttribute("aria-selected", "true"); expect(propertiesTab).toHaveAttribute("aria-selected", "false");
    fireEvent.click(propertiesTab); expect(propertiesTab).toHaveAttribute("aria-selected", "true"); expect(managerTargets.every(target => target.isConnected)).toBe(true);
    fireEvent.click(blocksTab); act(() => harness.handlers.get("component:selected")?.({ getAttributes: () => ({}) }));
    expect(propertiesTab).toHaveAttribute("aria-selected", "true");
  });

  it("clamps visual root resizing through the existing size callback without recreating the editor", async () => {
    vi.useFakeTimers(); fakeEditor(); const onSizeChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v8" widgetType="modal" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={onSizeChange} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const updateStyle = vi.fn(); const root = { getClasses: () => ["movecues-widget"] };
    act(() => harness.handlers.get("component:resize:update")?.({ component: root, rect: { w: 1400, h: 1200 }, style: { width: "1400px", height: "1200px" }, partial: false, updateStyle }));
    expect(updateStyle).toHaveBeenCalledWith({ width: "960px", height: "900px" }); expect(onSizeChange).toHaveBeenCalledWith({ width: { mode: "fixed", value: 960 }, height: { mode: "fixed", value: 900 } }); expect(harness.init).toHaveBeenCalledTimes(1);
  });
});

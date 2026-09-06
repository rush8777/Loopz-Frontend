import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { GrapesWidgetBuilder, type GrapesWidgetBuilderHandle } from "./GrapesWidgetBuilder";

const harness = vi.hoisted(() => ({ handlers: new Map<string, (...args: any[]) => void>(), init: vi.fn(), destroy: vi.fn(), dirty: 0 }));
vi.mock("grapesjs", () => ({ default: { init: harness.init } }));

function fakeEditor() {
  let html = '<section class="loopz-widget"><h2 data-loopz-content="heading">Hello</h2><p data-loopz-content="body">World</p></section>'; let css = ".loopz-widget{color:#111}"; let device = "Desktop"; const widgetElement = document.createElement("section"); const canvasDocument = document.implementation.createHTMLDocument();
  const editor: any = {
    DomComponents: { addType: vi.fn() }, UndoManager: { undo: vi.fn(), redo: vi.fn() }, Canvas: { setZoom: vi.fn(), setCoords: vi.fn(), getDocument: vi.fn(() => canvasDocument) }, refresh: vi.fn(),
    on: vi.fn((name: string, handler: (...args: any[]) => void) => harness.handlers.set(name, handler)), onReady: vi.fn((handler: () => void) => window.setTimeout(handler, 0)), destroy: harness.destroy,
    getHtml: vi.fn(() => html), getCss: vi.fn((options?: { avoidProtected?: boolean }) => options?.avoidProtected ? css : `*{box-sizing:border-box}body{margin:0}${css}`), getProjectData: vi.fn(() => ({ pages: [] })), getDirtyCount: vi.fn(() => harness.dirty), clearDirtyCount: vi.fn(), setDevice: vi.fn((name: string) => { device = name; }), getDevice: vi.fn(() => device), select: vi.fn(), setComponents: vi.fn((value: string) => { html = value; }), setStyle: vi.fn((value: string) => { css = value; }), getWrapper: vi.fn(() => ({ find: vi.fn((selector: string) => selector === ".loopz-widget" ? [{ getEl: () => widgetElement }] : []), components: vi.fn(() => ({ length: 0 })) })),
  };
  harness.init.mockImplementation((config: any) => { config.plugins?.forEach((plugin: any) => plugin(editor)); return editor; }); return editor;
}

describe("GrapesWidgetBuilder", () => {
  afterEach(() => { harness.handlers.clear(); harness.init.mockReset(); harness.destroy.mockReset(); harness.dirty = 0; vi.useRealTimers(); });
  it("initializes once, mounts custom managers, bootstraps once, and destroys cleanly", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); const props = { experienceKey: "exp:v1", widgetType: "modal" as const, content: { heading: "Hello", body: "World" }, design: { width: "md" as const, theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" as const } }, onChange, onPrimaryActionChange: vi.fn(), onSizeChange: vi.fn() };
    const view = render(<GrapesWidgetBuilder {...props} />); await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); });
    expect(harness.init).toHaveBeenCalledTimes(1); const config = harness.init.mock.calls[0][0]; expect(config.storageManager).toBe(false); expect(config.blockManager.appendTo).toBeInstanceOf(HTMLElement); expect(config.styleManager.appendTo).toBeInstanceOf(HTMLElement); expect(editor.setComponents).toHaveBeenCalledWith(expect.stringContaining('data-loopz-widget-type="modal"')); expect(onChange).toHaveBeenCalledTimes(1);
    view.rerender(<GrapesWidgetBuilder {...props} content={{ heading: "Changed externally", body: "World" }} />); expect(harness.init).toHaveBeenCalledTimes(1); view.unmount(); expect(harness.destroy).toHaveBeenCalledTimes(1);
  });

  it("exports only dirty project mutations after the builder debounce", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v2" widgetType="banner" value={{ version: 1, projectData: { pages: [] }, html: '<section class="loopz-widget"></section>', css: ".loopz-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); }); expect(onChange).not.toHaveBeenCalled(); expect(harness.init.mock.calls[0][0]).not.toHaveProperty("projectData"); expect(harness.init.mock.calls[0][0].components).toContain("loopz-widget"); editor.refresh.mockClear(); harness.dirty = 1; act(() => harness.handlers.get("update")?.()); act(() => vi.advanceTimersByTime(20)); expect(editor.refresh).toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled(); act(() => vi.advanceTimersByTime(380)); expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("applies sanitized HTML and scoped CSS from code mode exactly once", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v3" widgetType="toast" value={{ version: 1, projectData: { pages: [] }, html: '<section class="loopz-widget"></section>', css: ".loopz-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); }); const canvas = document.querySelector(".loopz-builder-editor"); fireEvent.click(screen.getByRole("button", { name: "Toggle HTML and CSS editor" })); expect(screen.getByLabelText("Builder CSS")).not.toHaveValue(expect.stringContaining("body{")); fireEvent.change(screen.getByLabelText("Builder HTML"), { target: { value: '<section class="loopz-widget"><script>alert(1)</script><p data-loopz-content="body">Safe</p></section>' } }); fireEvent.change(screen.getByLabelText("Builder CSS"), { target: { value: ".loopz-widget p{color:blue}" } }); fireEvent.click(screen.getByRole("button", { name: "Apply HTML and CSS" })); expect(onChange).toHaveBeenCalledTimes(1); expect(onChange.mock.calls[0][0].builder.html).not.toContain("script"); expect(onChange.mock.calls[0][0].builder.css).toContain(".loopz-widget"); fireEvent.click(screen.getByRole("button", { name: "Toggle HTML and CSS editor" })); act(() => vi.runOnlyPendingTimers()); expect(document.querySelector(".loopz-builder-editor")).toBe(canvas); expect(harness.init).toHaveBeenCalledTimes(1); expect(editor.refresh).toHaveBeenCalled();
  });

  it("flushes a pending canvas mutation without waiting for the debounce", async () => {
    vi.useFakeTimers(); fakeEditor(); const onChange = vi.fn(); const ref = createRef<GrapesWidgetBuilderHandle>(); render(<GrapesWidgetBuilder ref={ref} experienceKey="exp:v4" widgetType="modal" value={{ version: 1, projectData: { original: true }, html: '<section class="loopz-widget"></section>', css: ".loopz-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={onChange} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runOnlyPendingTimers(); }); harness.dirty = 1; act(() => harness.handlers.get("update")?.()); act(() => ref.current?.flush()); expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("uses a neutral authoring surface and fits the widget inside the visible workspace", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); render(<GrapesWidgetBuilder experienceKey="exp:v5" widgetType="modal" value={{ version: 1, projectData: { pages: [] }, html: '<section class="loopz-widget"></section>', css: ".loopz-widget{}" }} content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={vi.fn()} />);
    const canvas = document.querySelector<HTMLElement>(".loopz-builder-editor");
    expect(canvas).not.toBeNull();
    Object.defineProperties(canvas!, { clientWidth: { configurable: true, value: 720 }, clientHeight: { configurable: true, value: 560 } });
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const devices = harness.init.mock.calls[0][0].deviceManager.devices;
    expect(devices.map((entry: { width: string; height: string }) => [entry.width, entry.height])).toEqual([["1200px", "900px"], ["1200px", "900px"], ["1200px", "900px"]]);
    expect(editor.Canvas.setZoom).toHaveBeenCalledWith(100);
    expect(editor.Canvas.setCoords).toHaveBeenCalledWith(-240, 0);
    const widget = editor.getWrapper().find(".loopz-widget")[0].getEl();
    Object.defineProperties(widget, { offsetWidth: { configurable: true, value: 900 }, offsetHeight: { configurable: true, value: 700 } });
    fireEvent.click(screen.getByRole("button", { name: /Mobile/ }));
    act(() => vi.runAllTimers());
    expect(editor.setDevice).toHaveBeenLastCalledWith("Mobile");
    expect(editor.Canvas.setZoom).toHaveBeenLastCalledWith(expect.closeTo(66.29, 1));
    expect(editor.Canvas.setCoords).toHaveBeenLastCalledWith(expect.closeTo(-37.71, 1), 0);
  });

  it("clamps size input and explains the active widget limit", async () => {
    vi.useFakeTimers(); const editor = fakeEditor(); const onSizeChange = vi.fn(); render(<GrapesWidgetBuilder experienceKey="exp:v6" widgetType="toast" content={{ heading: "Hello", body: "World" }} design={{ width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }} onChange={vi.fn()} onPrimaryActionChange={vi.fn()} onSizeChange={onSizeChange} />);
    await act(async () => { await vi.dynamicImportSettled(); vi.runAllTimers(); });
    const width = screen.getByLabelText("Widget width"); expect(width).toHaveValue(380); fireEvent.change(width, { target: { value: "500" } }); expect(editor.Canvas.getDocument().head.querySelector("style[data-loopz-size-envelope]")?.textContent).toContain("width:500px!important"); expect(onSizeChange).not.toHaveBeenCalled(); fireEvent.change(width, { target: { value: "900" } }); fireEvent.blur(width);
    expect(width).toHaveValue(520); expect(screen.getByText("Maximum width for Toast is 520px.")).toBeInTheDocument(); expect(onSizeChange).toHaveBeenCalledWith({ width: { mode: "fixed", value: 520 }, height: { mode: "auto" } });
  });
});

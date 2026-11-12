import html from "../../index.html?raw";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StartupReady, StartupErrorBoundary } from "./StartupReady";

const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];

describe("HTML startup loader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    new Function("window", "document", script)(window, document);
  });
  afterEach(() => {
    window.dispatchEvent(new Event("movcues:startup-ready"));
    vi.runAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });
  it("is present before React and keeps the app inert during startup", () => {
    expect(document.getElementById("startup-loader")).toHaveAttribute("aria-busy", "true");
    expect(document.getElementById("root")).toHaveAttribute("inert");
    vi.advanceTimersByTime(5000);
    expect(document.getElementById("startup-loader")).toBeInTheDocument();
    expect(document.getElementById("startup-retry")).not.toBeVisible();
  });
  it("clears when a usable route commits and does not reappear", () => {
    render(<MemoryRouter><StartupReady><p>Ready page</p></StartupReady></MemoryRouter>);
    expect(screen.getByText("Ready page")).toBeInTheDocument();
    expect(document.getElementById("root")).not.toHaveAttribute("inert");
    vi.advanceTimersByTime(180);
    expect(document.getElementById("startup-loader")).toBeNull();
    vi.advanceTimersByTime(20000);
    expect(document.getElementById("startup-loader")).toBeNull();
  });
  it("waits through auth bootstrap before clearing the login screen", () => {
    const view = render(<StartupReady ready={false}><p>Preparing sign in</p></StartupReady>);
    expect(document.getElementById("startup-loader")).not.toHaveAttribute("data-ready");
    view.rerender(<StartupReady ready><p>Sign in</p></StartupReady>);
    expect(document.getElementById("startup-loader")).toHaveAttribute("data-ready");
  });
  it("supports public route outlets", () => {
    render(<MemoryRouter><Routes><Route element={<StartupReady />}><Route path="/" element={<p>Sign in</p>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(document.getElementById("startup-loader")).toHaveAttribute("data-ready");
  });
  it("offers recovery after a timeout and still accepts a late success", () => {
    vi.advanceTimersByTime(20000);
    expect(document.getElementById("startup-retry")).toBeVisible();
    expect(document.getElementById("startup-loader")).toHaveAttribute("aria-busy", "false");
    window.dispatchEvent(new Event("movcues:startup-ready"));
    vi.advanceTimersByTime(180);
    expect(document.getElementById("startup-loader")).toBeNull();
  });
  it("shows recovery when the entry module fails, ignoring unrelated scripts", () => {
    const unrelated = document.createElement("script");
    document.body.append(unrelated);
    unrelated.dispatchEvent(new Event("error"));
    expect(document.getElementById("startup-retry")).not.toBeVisible();
    const entry = document.createElement("script"); entry.type = "module";
    document.body.append(entry);
    entry.dispatchEvent(new Event("error"));
    expect(document.getElementById("startup-retry")).toBeVisible();
  });
  it("skips the fade for reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    window.dispatchEvent(new Event("movcues:startup-ready"));
    vi.advanceTimersByTime(0);
    expect(document.getElementById("startup-loader")).toBeNull();
  });
  it("shows recovery for a React render failure", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    function Broken(): never { throw new Error("test render failure"); }
    render(<StartupErrorBoundary><Broken /></StartupErrorBoundary>);
    expect(document.getElementById("startup-retry")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't open");
    quiet.mockRestore();
  });
});

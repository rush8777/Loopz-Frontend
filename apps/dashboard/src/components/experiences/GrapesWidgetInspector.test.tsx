import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GrapesWidgetInspector } from "./GrapesWidgetInspector";
import { getInspectorKind } from "./grapesWidgetInspectorModel";

function component(classes: string[], tagName = "div", attributes: Record<string, string> = {}, type = "default", parent: any = null) {
  const element = document.createElement(tagName);
  element.className = classes.join(" ");
  return {
    getClasses: () => [...classes],
    get: (key: string) => key === "tagName" ? tagName : key === "type" ? type : undefined,
    getAttributes: () => ({ ...attributes }),
    getEl: () => element,
    getStyle: () => ({}),
    getTraits: () => [],
    parent: () => parent,
  } as any;
}

describe("GrapesWidgetInspector", () => {
  it("detects stable Movcues component kinds without generated ids", () => {
    expect(getInspectorKind(component(["movecues-widget"]))).toBe("widget");
    expect(getInspectorKind(component(["movecues-widget__container"]))).toBe("container");
    expect(getInspectorKind(component(["movecues-free-area"], "div", {}, "movecues-free-area"))).toBe("free-area");
    expect(getInspectorKind(component(["movecues-widget__heading"], "h2"))).toBe("heading");
    expect(getInspectorKind(component(["movecues-widget__button"], "button", { "data-movecues-action-id": "primary" }))).toBe("button");
    expect(getInspectorKind(component(["movecues-widget__avatar-image"], "img"))).toBe("avatar");
    expect(getInspectorKind(component(["movecues-widget__video"], "video"))).toBe("video");
    expect(getInspectorKind(component(["movecues-widget__embed-frame"], "iframe"))).toBe("embed");
    expect(getInspectorKind(component(["movecues-widget__body"], "p"), true)).toBe("free-item");
  });

  it("keeps Free Area items on their precise position inspector and omits normal-flow controls", () => {
    const root = component(["movecues-widget"], "section"); const area = component(["movecues-free-area"], "div", {}, "movecues-free-area", root); const item = component(["movecues-widget__body"], "p", {}, "default", area);
    render(<GrapesWidgetInspector editor={null} component={item} isFreeItem styleRevision={0} readStyle={() => ({ authored: {}, effective: {} })} onStyleChange={vi.fn()} onSelect={vi.fn()} traitsRef={createRef()} stylesRef={createRef()} widgetSize={<div>Widget size</div>} freePosition={<section><h3>Position</h3><input aria-label="Position X" /></section>} interaction={null} />);
    expect(screen.getByRole("heading", { name: "Position" })).toBeInTheDocument(); expect(screen.getByLabelText("Position X")).toBeInTheDocument(); expect(screen.queryByRole("group", { name: "Direction" })).not.toBeInTheDocument(); expect(screen.queryByRole("group", { name: "Width" })).not.toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Typography" })).toBeInTheDocument();
  });

  it("labels trait-bearing media as Content while keeping the manager target mounted", () => {
    const image = component(["movecues-widget__image"], "img"); image.getTraits = () => [{ id: "src" }]; const traitsRef = createRef<HTMLDivElement>();
    render(<GrapesWidgetInspector editor={null} component={image} isFreeItem={false} styleRevision={0} readStyle={() => ({ authored: {}, effective: {} })} onStyleChange={vi.fn()} onSelect={vi.fn()} traitsRef={traitsRef} stylesRef={createRef()} widgetSize={null} freePosition={null} interaction={null} />);
    expect(screen.getByRole("heading", { name: "Content" })).toBeInTheDocument(); expect(traitsRef.current).toBeInTheDocument(); expect(screen.getByRole("group", { name: "Fit" })).toBeInTheDocument();
  });
});

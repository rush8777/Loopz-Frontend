import { describe, expect, it } from "vitest";
import type { ExperienceDesign, WidgetType } from "../../types/experiences";
import { normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS, widgetSizeCss } from "./widgetSizing";

const design = (width: "sm" | "md" | "lg" = "md", size?: ExperienceDesign["size"]): ExperienceDesign => ({ width, size, theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } });

describe("widget sizing", () => {
  it("provides the requested widget-specific defaults", () => {
    const expected: Record<WidgetType, number | "full"> = { anchored_card: 320, toast: 380, cursor_follow: 280, modal: 600, slideout: 400, hotspot: 300, banner: "full" };
    for (const [type, value] of Object.entries(expected) as Array<[WidgetType, number | "full"]>) expect(WIDGET_SIZE_CONSTRAINTS[type].width.default).toBe(value);
  });

  it("clamps fixed widths below and above each widget envelope", () => {
    for (const type of ["anchored_card", "toast", "cursor_follow", "modal", "slideout", "hotspot"] as WidgetType[]) {
      const constraint = WIDGET_SIZE_CONSTRAINTS[type].width;
      expect(normalizeWidgetSize(type, design("md", { width: { mode: "fixed", value: 1 }, height: { mode: "auto" } })).width.value).toBe(constraint.min);
      expect(normalizeWidgetSize(type, design("md", { width: { mode: "fixed", value: 5000 }, height: { mode: "auto" } })).width.value).toBe(constraint.max);
    }
  });

  it("allows modal fullscreen, locks banners full width, and normalizes legacy sizes", () => {
    expect(normalizeWidgetSize("modal", design("md", { width: { mode: "full" }, height: { mode: "viewport" } }))).toEqual({ width: { mode: "full" }, height: { mode: "viewport" } });
    expect(normalizeWidgetSize("banner", design("sm", { width: { mode: "fixed", value: 100 }, height: { mode: "fixed", value: 100 } }))).toEqual({ width: { mode: "full" }, height: { mode: "auto" } });
    expect(normalizeWidgetSize("toast", design("sm")).width.value).toBe(280);
    expect(normalizeWidgetSize("toast", design("md")).width.value).toBe(380);
    expect(normalizeWidgetSize("toast", design("lg")).width.value).toBe(520);
  });

  it("adds mobile viewport safety to floating widgets", () => {
    const css = widgetSizeCss("toast", design());
    expect(css.maxWidth).toBe("min(520px,calc(100vw - 24px))");
    expect(css.maxHeight).toBe("calc(100vh - 24px)");
  });
});

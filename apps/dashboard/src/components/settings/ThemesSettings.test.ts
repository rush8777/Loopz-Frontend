import { describe, expect, it } from "vitest";
import type { SiteThemeTokens } from "../../types/themes";
import { isTerminalThemeCaptureStatus, isValidThemeTokens } from "./ThemesSettings";

const tokens = (): SiteThemeTokens => ({
  version: 1,
  colors: {
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#111827",
    mutedText: "#64748b",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    border: "#e2e8f0",
  },
  typography: {
    bodyFontFamily: "Inter, sans-serif",
    headingFontFamily: "Inter, sans-serif",
    bodyFontSize: 16,
    headingFontSize: 32,
    bodyFontWeight: 400,
    headingFontWeight: 700,
    bodyLineHeight: 1.5,
    headingLineHeight: 1.2,
  },
  radii: { sm: 4, md: 8, lg: 16 },
  shadows: {
    sm: { x: 0, y: 1, blur: 2, spread: 0, color: "rgba(0, 0, 0, 0.1)" },
    md: { x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0, 0, 0, 0.15)" },
  },
});

describe("theme extraction state", () => {
  it.each(["received", "expired", "origin_mismatch"] as const)("stops polling when capture status is %s", status => {
    expect(isTerminalThemeCaptureStatus(status)).toBe(true);
  });

  it("continues polling while a capture is pending", () => {
    expect(isTerminalThemeCaptureStatus("pending")).toBe(false);
  });

  it("accepts extracted tokens that match the backend contract", () => {
    expect(isValidThemeTokens(tokens())).toBe(true);
  });

  it("rejects token edits that the backend would reject", () => {
    expect(isValidThemeTokens({ ...tokens(), typography: { ...tokens().typography, bodyLineHeight: 4 } })).toBe(false);
    expect(isValidThemeTokens({ ...tokens(), shadows: { ...tokens().shadows, md: { ...tokens().shadows.md, blur: 201 } } })).toBe(false);
  });
});

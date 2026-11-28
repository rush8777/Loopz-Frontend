export interface ThemeShadow { x: number; y: number; blur: number; spread: number; color: string }
export type ThemeControl = "primaryButton" | "secondaryButton" | "input" | "selection" | "progress" | "closeButton" | "checklistItem" | "navigation";
export interface ThemeControlStyle { radius?: number; minHeight?: number; background?: string; foreground?: string }
export interface ThemeComponentStyle {
  spacing?: number; radius?: number; buttonRadius?: number; width?: number;
  bodyFontSize?: number; headingFontSize?: number; bodyLineHeight?: number; headingLineHeight?: number;
  background?: string; surface?: string; text?: string; shadow?: ThemeShadow;
}

export interface SiteThemeTokens {
  version: 1 | 2;
  colors: { background: string; surface: string; text: string; mutedText: string; primary: string; primaryForeground: string; border: string };
  typography: { bodyFontFamily: string; headingFontFamily: string; bodyFontSize: number; headingFontSize: number; bodyFontWeight: number; headingFontWeight: number; bodyLineHeight: number; headingLineHeight: number };
  radii: { sm: number; md: number; lg: number };
  shadows: { sm: ThemeShadow; md: ThemeShadow };
  spacing?: number;
  width?: number;
  motion?: "system" | "off";
  focusColor?: string;
  shared?: Partial<Record<ThemeControl, ThemeControlStyle>>;
  components?: Partial<Record<ThemeComponent, ThemeComponentStyle>>;
}
export type ThemeComponent = "modal" | "anchored_card" | "survey" | "checklist" | "banner" | "slideout" | "toast" | "hotspot" | "cursor_follow" | "guide" | "geo_agent";
export type ThemePresetId = "minimal" | "modern" | "soft" | "dark";
export type ThemeSelection = { source: "preset"; preset: ThemePresetId } | { source: "saved"; presetId: string };
export type SavedTheme = { id: string; name: string; tokens: SiteThemeTokens; updatedAt: string; sourceCaptureId?: string | null; sourceDesign?: ImportedDesign | null };
export type ThemePreview = { id: ThemeComponent; stepId?: string; definition: unknown; kind: "guide" | "checklist" | "widget"; widgetType: string | null };
export type ThemeCaptureStatus = "pending" | "received" | "expired" | "origin_mismatch";
export interface ThemeCapture { id: string; status: ThemeCaptureStatus; expiresAt: string; receivedAt: string | null; errorCode: string | null }
export interface SiteThemeResponse {
  active: { tokens: SiteThemeTokens; updatedAt: string } | null;
  candidate: { captureId: string; tokens: SiteThemeTokens; evidence: { confidence: Record<string, number> }; origin: string; capturedAt: string } | null;
  capture: ThemeCapture | null;
  builtIn: Record<ThemePresetId, SiteThemeTokens>;
}


export interface ImportedDesign {
  tokens: SiteThemeTokens;
  explanation: string;
  assumptions: string[];
}
export type ThemeImportResult =
  | { status: "awaiting_generation" | "working" }
  | { status: "ready"; proposal: ImportedDesign }
  | { status: "failed"; reason: "unavailable" | "daily_limit" | "timeout" | "provider_error" | "invalid_design"; fallback: SiteThemeTokens };
export type ThemeEditScope = "auto" | "theme" | "foundation" | ThemeComponent | ThemeControl;
export type ThemeProposal = { tokens: SiteThemeTokens; explanation: string; scope: ThemeEditScope; revision: number };

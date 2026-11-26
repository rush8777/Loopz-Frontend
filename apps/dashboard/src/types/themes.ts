export interface ThemeShadow { x: number; y: number; blur: number; spread: number; color: string }
export interface SiteThemeTokens {
  version: 1;
  colors: { background: string; surface: string; text: string; mutedText: string; primary: string; primaryForeground: string; border: string };
  typography: { bodyFontFamily: string; headingFontFamily: string; bodyFontSize: number; headingFontSize: number; bodyFontWeight: number; headingFontWeight: number; bodyLineHeight: number; headingLineHeight: number };
  radii: { sm: number; md: number; lg: number };
  shadows: { sm: ThemeShadow; md: ThemeShadow };
  spacing?: number;
  components?: Partial<Record<ThemeComponent, { spacing?: number; radius?: number; buttonRadius?: number }>>;
}
export type ThemeComponent = "modal" | "anchored_card" | "survey" | "checklist" | "banner" | "slideout" | "toast" | "hotspot" | "cursor_follow" | "guide";
export type ThemePresetId = "minimal" | "modern" | "soft" | "dark";
export type ThemeSelection = { source: "preset"; preset: ThemePresetId } | { source: "saved"; presetId: string };
export type SavedTheme = { id: string; name: string; tokens: SiteThemeTokens; updatedAt: string };
export type ThemePreview = { id: ThemeComponent; stepId?: string; definition: unknown; kind: "guide" | "checklist" | "widget"; widgetType: string | null };
export type ThemeCaptureStatus = "pending" | "received" | "expired" | "origin_mismatch";
export interface ThemeCapture { id: string; status: ThemeCaptureStatus; expiresAt: string; receivedAt: string | null; errorCode: string | null }
export interface SiteThemeResponse {
  active: { tokens: SiteThemeTokens; updatedAt: string } | null;
  candidate: { captureId: string; tokens: SiteThemeTokens; evidence: { confidence: Record<string, number>; cssVariables: Record<string, string>; sdkVersion: string }; origin: string; capturedAt: string } | null;
  capture: ThemeCapture | null;
  builtIn: Record<ThemePresetId, SiteThemeTokens>;
}

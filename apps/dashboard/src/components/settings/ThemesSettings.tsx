import type { SiteThemeTokens, ThemeCaptureStatus, ThemeComponent } from "../../types/themes";

const safeColor = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s-]+\)|[a-z]{1,20})$/i;

const validColor = (value: string) => safeColor.test(value.trim()) && (typeof CSS === "undefined" || typeof CSS.supports !== "function" || CSS.supports("color", value));
const validShadow = (value: SiteThemeTokens["shadows"]["sm"]) => validColor(value.color)
  && inRange(value.x, -100, 100) && inRange(value.y, -100, 100)
  && inRange(value.blur, 0, 200) && inRange(value.spread, -100, 100);
const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

export function isValidThemeTokens(tokens: SiteThemeTokens): boolean {
  const typography = tokens.typography;
  return Object.values(tokens.colors).every(validColor)
    && [typography.bodyFontFamily, typography.headingFontFamily].every(value => value.trim() && value.length <= 200 && !/[{};@]|url\s*\(/i.test(value))
    && inRange(typography.bodyFontSize, 8, 72)
    && inRange(typography.headingFontSize, 10, 160)
    && [typography.bodyFontWeight, typography.headingFontWeight].every(value => Number.isInteger(value) && inRange(value, 100, 900))
    && [typography.bodyLineHeight, typography.headingLineHeight].every(value => inRange(value, 0.8, 3))
    && Object.values(tokens.radii).every(value => inRange(value, 0, 100))
    && (tokens.spacing === undefined || inRange(tokens.spacing, 0, 64))
    && Object.values(tokens.components ?? {}).every(component =>
      (component.spacing === undefined || inRange(component.spacing, 0, 64))
      && [component.radius, component.buttonRadius].every(value => value === undefined || inRange(value, 0, 100))
      && (component.width === undefined || Number.isInteger(component.width) && inRange(component.width, 200, 960))
      && (component.bodyFontSize === undefined || inRange(component.bodyFontSize, 8, 72))
      && (component.headingFontSize === undefined || inRange(component.headingFontSize, 10, 160))
      && [component.bodyLineHeight, component.headingLineHeight].every(value => value === undefined || inRange(value, .8, 3))
      && [component.background, component.surface, component.text].every(value => value === undefined || validColor(value))
      && (component.shadow === undefined || validShadow(component.shadow)))
    && Object.values(tokens.shared ?? {}).every(control => (control.radius === undefined || inRange(control.radius, 0, 100))
      && (control.minHeight === undefined || inRange(control.minHeight, 0, 72))
      && [control.background, control.foreground].every(value => value === undefined || validColor(value)))
    && (tokens.focusColor === undefined || validColor(tokens.focusColor))
    && Object.values(tokens.shadows).every(validShadow);
}

export function isTerminalThemeCaptureStatus(status: ThemeCaptureStatus): boolean {
  return status === "received" || status === "expired" || status === "origin_mismatch";
}

export function colorPickerValue(value: string): string {
  const trimmed = value.trim();
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(trimmed);
  if (hex) return `#${hex[1]}`;
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])(?:[0-9a-f])?$/i.exec(trimmed);
  if (shortHex) return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  const rgb = /^rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/i.exec(trimmed);
  if (!rgb) return "#000000";
  const percent = trimmed.slice(0, trimmed.indexOf(")")).includes("%");
  const channel = (raw: string) => Math.round(Math.min(255, Math.max(0, Number(raw) * (percent ? 2.55 : 1)))).toString(16).padStart(2, "0");
  return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
}

export const themeComponentNames: Record<ThemeComponent, string> = {
  modal: "Modal", anchored_card: "Anchored card", survey: "Survey", checklist: "Checklist",
  banner: "Banner", slideout: "Slideout", toast: "Toast", hotspot: "Hotspot",
  cursor_follow: "Cursor follower", guide: "Guide tooltip", geo_agent: "Geo Agent",
};

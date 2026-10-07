import type { ExperienceDesign, ExperienceSize, LegacyExperienceWidth, WidgetType } from "../../types/experiences";

export interface WidgetSizeConstraint {
  width: { default: number | "full"; min?: number; max?: number; allowFull?: boolean };
  height: { default: "auto"; allowFixed?: boolean; allowViewport?: boolean; min?: number; max?: number };
  viewportGutter: number;
}

export const WIDGET_SIZE_CONSTRAINTS: Record<WidgetType, WidgetSizeConstraint> = {
  anchored_card: { width: { default: 320, min: 240, max: 480 }, height: { default: "auto", allowFixed: true, min: 120, max: 700 }, viewportGutter: 24 },
  toast: { width: { default: 380, min: 280, max: 520 }, height: { default: "auto" }, viewportGutter: 24 },
  cursor_follow: { width: { default: 280, min: 200, max: 360 }, height: { default: "auto" }, viewportGutter: 24 },
  modal: { width: { default: 600, min: 320, max: 960, allowFull: true }, height: { default: "auto", allowFixed: true, allowViewport: true, min: 200, max: 900 }, viewportGutter: 24 },
  slideout: { width: { default: 400, min: 320, max: 640 }, height: { default: "auto", allowFixed: true, allowViewport: true, min: 240, max: 900 }, viewportGutter: 24 },
  hotspot: { width: { default: 300, min: 220, max: 420 }, height: { default: "auto" }, viewportGutter: 24 },
  banner: { width: { default: "full" }, height: { default: "auto" }, viewportGutter: 0 },
  survey: { width: { default: 700, min: 320, max: 960, allowFull: true }, height: { default: "auto", allowFixed: true, allowViewport: true, min: 200, max: 900 }, viewportGutter: 24 },
};

export function normalizeWidgetSize(widgetType: WidgetType, design: Pick<ExperienceDesign, "width" | "size">): ExperienceSize {
  const constraint = WIDGET_SIZE_CONSTRAINTS[widgetType];
  if (widgetType === "banner") return { width: { mode: "full" }, height: { mode: "auto" } };
  const legacyValue = legacyWidth(widgetType, design.width);
  const requestedWidth = design.size?.width;
  const width = requestedWidth?.mode === "full" && constraint.width.allowFull
    ? { mode: "full" as const }
    : { mode: "fixed" as const, value: clamp(requestedWidth?.value ?? legacyValue, constraint.width.min!, constraint.width.max!) };
  const requestedHeight = design.size?.height;
  const height = requestedHeight?.mode === "fixed" && constraint.height.allowFixed
    ? { mode: "fixed" as const, value: clamp(requestedHeight.value ?? constraint.height.min!, constraint.height.min!, constraint.height.max!) }
    : requestedHeight?.mode === "viewport" && constraint.height.allowViewport
      ? { mode: "viewport" as const }
      : { mode: "auto" as const };
  return { width, height };
}

export function clampWidgetWidth(widgetType: WidgetType, value: number): { value: number; boundary?: "min" | "max" } {
  const width = WIDGET_SIZE_CONSTRAINTS[widgetType].width;
  if (typeof width.default !== "number") return { value: 0 };
  if (value < width.min!) return { value: width.min!, boundary: "min" };
  if (value > width.max!) return { value: width.max!, boundary: "max" };
  return { value };
}

export function clampWidgetHeight(widgetType: WidgetType, value: number): { value: number; boundary?: "min" | "max" } {
  const height = WIDGET_SIZE_CONSTRAINTS[widgetType].height;
  if (!height.allowFixed) return { value: 0 };
  if (value < height.min!) return { value: height.min!, boundary: "min" };
  if (value > height.max!) return { value: height.max!, boundary: "max" };
  return { value };
}

export function widgetSizeCss(widgetType: WidgetType, design: Pick<ExperienceDesign, "width" | "size">): { width: string; height: string; minWidth?: string; maxWidth?: string; maxHeight: string } {
  const size = normalizeWidgetSize(widgetType, design); const constraint = WIDGET_SIZE_CONSTRAINTS[widgetType];
  const viewportWidth = `var(--movcues-usable-viewport-width,calc(100vw - ${constraint.viewportGutter}px))`;
  const viewportHeight = `var(--movcues-usable-viewport-height,calc(100vh - ${Math.max(24, constraint.viewportGutter)}px))`;
  return {
    width: size.width.mode === "full" ? "100%" : `${size.width.value}px`,
    height: size.height.mode === "fixed" ? `${size.height.value}px` : size.height.mode === "viewport" ? viewportHeight : "auto",
    minWidth: constraint.width.min ? `min(${constraint.width.min}px,${viewportWidth})` : undefined,
    maxWidth: constraint.width.max ? `min(${constraint.width.max}px,${viewportWidth})` : undefined,
    maxHeight: viewportHeight,
  };
}

/** Preview-only envelope rules. The body is GrapesJS infrastructure and is not returned by editor.getHtml(). */
export function builderPreviewSizeEnvelopeCss(widgetType: WidgetType, design: Pick<ExperienceDesign, "width" | "size">): string {
  const size = widgetSizeCss(widgetType, design); const normalized = normalizeWidgetSize(widgetType, design); const fillsHeight = normalized.height.mode !== "auto";
  const width = normalized.width.mode === "full" ? "100%" : size.width;
  const gutter = WIDGET_SIZE_CONSTRAINTS[widgetType].viewportGutter;
  const verticalGutter = Math.max(24, gutter);
  return `:root{--movcues-usable-viewport-width:calc(100vw - ${gutter}px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px));--movcues-usable-viewport-height:calc(100vh - ${verticalGutter}px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}@supports(width:100dvw){:root{--movcues-usable-viewport-width:calc(100dvw - ${gutter}px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px))}}@supports(height:100dvh){:root{--movcues-usable-viewport-height:calc(100dvh - ${verticalGutter}px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}}body{width:${width}!important;${size.minWidth ? `min-width:${size.minWidth}!important;` : "min-width:0!important;"}${size.maxWidth ? `max-width:${size.maxWidth}!important;` : "max-width:none!important;"}height:${size.height}!important;max-height:${size.maxHeight}!important;overflow:visible!important}body>.movcues-widget{box-sizing:border-box;width:100%!important;min-width:0!important;max-width:100%!important;height:${fillsHeight ? "100%" : "auto"}!important;max-height:${size.maxHeight}!important;overflow-y:auto!important;overscroll-behavior:contain}`;
}

function legacyWidth(widgetType: WidgetType, width: LegacyExperienceWidth): number {
  const constraint = WIDGET_SIZE_CONSTRAINTS[widgetType].width;
  if (typeof constraint.default !== "number") return 0;
  if (width === "sm") return constraint.min!;
  if (width === "lg") return constraint.max!;
  return constraint.default;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));
}

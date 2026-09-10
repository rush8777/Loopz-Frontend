import type { PageRule } from "./api";
export type ExperienceKind = "guide" | "widget";
export type WidgetType = "anchored_card" | "toast" | "cursor_follow" | "modal" | "slideout" | "hotspot" | "banner";
export type ExperienceStatus = "draft" | "published" | "paused" | "archived";
export interface ExperienceAction { label: string; type: "dismiss" | "next_step" | "open_url" | "track_event"; url?: string; eventName?: string }
export interface ExperienceContent { heading: string; body: string; primaryAction?: ExperienceAction; secondaryAction?: { label: string; type: "dismiss" } }
export interface ExperienceTarget { primarySelector: string; fallbackSelectors: string[]; label?: string; role?: string; tagName?: string; reliability: "reliable" | "moderate" | "fragile"; targetContext?: { pagePath: string } }
export type LegacyExperienceWidth = "sm" | "md" | "lg";
export interface ExperienceSize { width: { mode: "auto" | "fixed" | "full"; value?: number }; height: { mode: "auto" | "fixed" | "viewport"; value?: number } }
export interface ExperienceDesign { width: LegacyExperienceWidth; size?: ExperienceSize; theme: { background: string; foreground: string; primary: string; borderRadius: "sm" | "md" | "lg" } }
export interface WidgetBuilderState { version: 1; projectData: Record<string, unknown>; html: string; css: string }
export interface ExperienceBehavior { dismissible: boolean; zIndex?: number; placement?: "auto" | "top" | "right" | "bottom" | "left"; alignment?: "start" | "center" | "end"; offset?: number; toastPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"; autoDismissMs?: number | null; cursorOffset?: { x: number; y: number }; modalLayout?: "center" | "fullscreen"; backdrop?: boolean; backdropOpacity?: number; closeOnBackdrop?: boolean; slideoutPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center-left" | "center-right"; bannerPosition?: "top" | "bottom"; hotspotStyle?: "pulse" | "dot" | "question"; hotspotColor?: string }
export interface ExperienceTargeting { pageRules: PageRule[]; audience: { type: "all" } | { type: "segment"; segmentId: string } | { type: "segment_rules"; logic: "all" | "any"; conditions: Array<{ id: string; segmentId: string; operator: "matches" | "not_matches" }> }; trigger: { type: "page_load" } | { type: "custom_event"; eventName: string }; frequency: { mode: "once" | "once_per_session" | "every_time"; cooldownHours?: number; maxImpressions?: number }; priority: number; interruptPolicy?: "queue" | "interrupt"; schedule?: { startsAt?: string; endsAt?: string }; allowedOrigins?: string[] }
export type GuideAdvance = { type: "button" } | { type: "element_click" } | { type: "element_hover"; durationMs?: number } | { type: "custom_event"; eventName: string } | { type: "route"; pageRules: PageRule[] };
export interface GuideStep { id: string; content: ExperienceContent; builder?: WidgetBuilderState; advance?: GuideAdvance; target?: ExperienceTarget; behavior: Pick<ExperienceBehavior, "placement" | "alignment" | "offset" | "dismissible"> }
export type ExperienceDefinition =
  | { content: ExperienceContent; design: ExperienceDesign; behavior: ExperienceBehavior; builder?: WidgetBuilderState; target?: ExperienceTarget; targeting: ExperienceTargeting }
  | { steps: GuideStep[]; design: ExperienceDesign; targeting: ExperienceTargeting };
export interface ExperienceVersion { id: string; experienceId: string; versionNumber: number; state: "draft" | "published"; definition: ExperienceDefinition; createdBy: string; createdAt: string; publishedAt: string | null }
export interface Experience { id: string; siteId: string; kind: ExperienceKind; widgetType: WidgetType | null; name: string; status: ExperienceStatus; buildPageId: string | null; buildUrl: string | null; publishedVersionId: string | null; createdBy: string; createdAt: string; updatedAt: string; draftVersion: ExperienceVersion | null; publishedVersion: ExperienceVersion | null }
export function isGuideDefinition(definition: ExperienceDefinition): definition is Extract<ExperienceDefinition, { steps: GuideStep[] }> { return "steps" in definition; }

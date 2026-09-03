import type { PageRule } from "./api";
export type ExperienceKind = "guide" | "widget";
export type WidgetType = "anchored_card" | "toast" | "cursor_follow";
export type ExperienceStatus = "draft" | "published" | "paused" | "archived";
export interface ExperienceAction { label: string; type: "dismiss" | "next_step" | "open_url" | "track_event"; url?: string; eventName?: string }
export interface ExperienceContent { heading: string; body: string; primaryAction?: ExperienceAction; secondaryAction?: { label: string; type: "dismiss" } }
export interface ExperienceTarget { primarySelector: string; fallbackSelectors: string[]; label?: string; role?: string; tagName?: string; reliability: "reliable" | "moderate" | "fragile" }
export interface ExperienceDesign { width: "sm" | "md" | "lg"; theme: { background: string; foreground: string; primary: string; borderRadius: "sm" | "md" | "lg" } }
export interface ExperienceBehavior { dismissible: boolean; zIndex?: number; placement?: "auto" | "top" | "right" | "bottom" | "left"; alignment?: "start" | "center" | "end"; offset?: number; toastPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"; autoDismissMs?: number | null; cursorOffset?: { x: number; y: number } }
export interface ExperienceTargeting { pageRules: PageRule[]; audience: { type: "all" } | { type: "segment"; segmentId: string }; trigger: { type: "page_load" } | { type: "custom_event"; eventName: string }; frequency: { mode: "once" | "once_per_session" | "every_time"; cooldownHours?: number; maxImpressions?: number }; priority: number }
export interface GuideStep { id: string; content: ExperienceContent; target?: ExperienceTarget; behavior: Pick<ExperienceBehavior, "placement" | "alignment" | "offset" | "dismissible"> }
export type ExperienceDefinition =
  | { content: ExperienceContent; design: ExperienceDesign; behavior: ExperienceBehavior; target?: ExperienceTarget; targeting: ExperienceTargeting }
  | { steps: GuideStep[]; design: ExperienceDesign; targeting: ExperienceTargeting };
export interface ExperienceVersion { id: string; experienceId: string; versionNumber: number; state: "draft" | "published"; definition: ExperienceDefinition; createdBy: string; createdAt: string; publishedAt: string | null }
export interface Experience { id: string; siteId: string; kind: ExperienceKind; widgetType: WidgetType | null; name: string; status: ExperienceStatus; buildPageId: string | null; buildUrl: string | null; publishedVersionId: string | null; createdBy: string; createdAt: string; updatedAt: string; draftVersion: ExperienceVersion | null; publishedVersion: ExperienceVersion | null }
export function isGuideDefinition(definition: ExperienceDefinition): definition is Extract<ExperienceDefinition, { steps: GuideStep[] }> { return "steps" in definition; }


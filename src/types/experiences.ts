import type { PageRule } from "./api";
export type ExperienceKind = "guide" | "widget";
export type WidgetType = "anchored_card" | "toast" | "cursor_follow" | "modal" | "slideout" | "hotspot" | "banner" | "survey";
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
export type GuideStepPattern = "anchored_card" | "modal";
export interface GuideStep { id: string; pattern?: GuideStepPattern; content: ExperienceContent; builder?: WidgetBuilderState; size?: ExperienceSize; advance?: GuideAdvance; target?: ExperienceTarget; behavior: Pick<ExperienceBehavior, "placement" | "alignment" | "offset" | "dismissible"> }
export function getGuideStepPattern(step: Pick<GuideStep, "pattern">): GuideStepPattern { return step.pattern ?? "anchored_card"; }
export function guideStepRequiresTarget(step: Pick<GuideStep, "pattern">): boolean { return getGuideStepPattern(step) === "anchored_card"; }
export function guideStepSupportsTargetAdvance(step: Pick<GuideStep, "pattern">): boolean { return guideStepRequiresTarget(step); }
export interface SurveyOption { id: string; label: string }
export type SurveyQuestion =
  | { id: string; type: "single_choice"; label: string; required?: boolean; options: SurveyOption[] }
  | { id: string; type: "multiple_choice"; label: string; required?: boolean; options: SurveyOption[] }
  | { id: string; type: "short_text"; label: string; required?: boolean; placeholder?: string; maxLength?: number }
  | { id: string; type: "long_text"; label: string; required?: boolean; placeholder?: string; maxLength?: number }
  | { id: string; type: "rating"; label: string; required?: boolean; min: number; max: number }
  | { id: string; type: "nps"; label: string; required?: boolean };
export interface SurveyStep { id: string; content: { heading: string; body: string }; questions: SurveyQuestion[]; builder?: WidgetBuilderState; size?: ExperienceSize }
export interface SurveyConfig { steps: SurveyStep[]; showProgress: boolean; allowBack: boolean; submitLabel: string }
export type ExperienceDefinition =
  | { content: ExperienceContent; design: ExperienceDesign; behavior: ExperienceBehavior; builder?: WidgetBuilderState; target?: ExperienceTarget; targeting: ExperienceTargeting; survey?: SurveyConfig }
  | { steps: GuideStep[]; design: ExperienceDesign; targeting: ExperienceTargeting };
export interface ExperienceVersion { id: string; experienceId: string; versionNumber: number; state: "draft" | "published"; definition: ExperienceDefinition; createdBy: string; createdAt: string; publishedAt: string | null }
export interface Experience { id: string; siteId: string; kind: ExperienceKind; widgetType: WidgetType | null; name: string; status: ExperienceStatus; buildPageId: string | null; buildUrl: string | null; publishedVersionId: string | null; createdBy: string; createdAt: string; updatedAt: string; draftVersion: ExperienceVersion | null; publishedVersion: ExperienceVersion | null }
export interface ExperienceAnalytics {
  experience: { id: string; name: string; kind: ExperienceKind; widgetType: WidgetType | null };
  summary: { usersSeen: number; usersStarted: number; completed: number; dismissed: number; completionRate: number };
  guide: null | { steps: { stepId: string; stepIndex: number; usersReached: number; usersAdvanced: number; dropOff: number; dropOffRate: number; averageDurationMs: number }[] };
  survey: null | { usersSeen: number; started: number; submitted: number; abandoned: number; responseRate: number; questions: Array<{ questionId: string; label: string; type: SurveyQuestion["type"]; responseCount: number; distribution?: { value: string; count: number; percent: number }[]; textResponses?: string[] }> };
  trend: { date: string; usersSeen: number; completed: number; dismissed: number; submitted: number }[];
}
export interface SurveyResponseRecord { responseId: string; impressionId: string; anonymousId: string; trackedUserId: string | null; sessionId: string; answers: SurveyAnswers; startedAt: string; submittedAt: string | null; abandonedAt: string | null }
export type SurveyAnswers = Record<string, string | string[] | number>;
export function isGuideDefinition(definition: ExperienceDefinition): definition is Extract<ExperienceDefinition, { steps: GuideStep[] }> { return "steps" in definition; }

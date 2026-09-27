import type { EventDefinitionSummary, PageDefinition, Segment } from "../../../types/api";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { getGuideStepPattern, guideStepRequiresTarget, isChecklistDefinition, isGuideDefinition, isWidgetDefinition } from "../../../types/experiences";

export type LaunchCheckStatus = "ready" | "warning" | "blocking";
export type LaunchSection = "audience" | "pages" | "trigger" | "timing" | "behavior" | "content" | "steps" | "checklist";
export interface LaunchCheck { id: string; status: LaunchCheckStatus; title: string; description?: string; section: LaunchSection }
export interface LaunchReferenceData { pages: PageDefinition[]; segments: Segment[]; events: EventDefinitionSummary[]; guides: Experience[] }

export function matchingPage(definition: ExperienceDefinition, pages: PageDefinition[]) {
  return pages.find((page) => JSON.stringify(page.rules) === JSON.stringify(definition.targeting.pageRules));
}

export function isBroadLaunch(definition: ExperienceDefinition): boolean {
  const targeting = definition.targeting;
  if (targeting.audience.type !== "all" || targeting.pageRules.length !== 0) return false;
  return isChecklistDefinition(definition) || definition.targeting.trigger.type === "page_load";
}

export function getLaunchChecks(experience: Pick<Experience, "kind" | "widgetType">, definition: ExperienceDefinition, refs: LaunchReferenceData): LaunchCheck[] {
  const checks: LaunchCheck[] = [];
  const { targeting } = definition;
  const segmentIds = new Set(refs.segments.map((segment) => segment.id));
  const guideById = new Map(refs.guides.map((guide) => [guide.id, guide]));
  const add = (check: LaunchCheck) => checks.push(check);

  if (targeting.audience.type === "all") add({ id: "audience-all", status: "warning", section: "audience", title: "Everyone can qualify", description: "Audience targeting is intentionally broad." });
  if (targeting.audience.type === "segment" && !segmentIds.has(targeting.audience.segmentId)) add({ id: "audience-segment", status: "blocking", section: "audience", title: "Choose a valid Segment" });
  if (targeting.audience.type === "segment_rules") {
    if (!targeting.audience.conditions.length) add({ id: "audience-rules-empty", status: "blocking", section: "audience", title: "Add at least one Segment rule" });
    else if (targeting.audience.conditions.some((condition) => !segmentIds.has(condition.segmentId))) add({ id: "audience-rules-invalid", status: "blocking", section: "audience", title: "A Segment rule is no longer available" });
  }

  if (!targeting.pageRules.length) add({ id: "pages-all", status: "warning", section: "pages", title: "All pages", description: "This experience can appear anywhere the Movcues SDK is running." });
  else if (!targeting.pageRules.some((rule) => rule.kind === "include") || targeting.pageRules.some((rule) => !rule.value.trim())) add({ id: "pages-invalid", status: "blocking", section: "pages", title: "Page targeting needs attention" });

  if (!isChecklistDefinition(definition)) {
    if (definition.targeting.trigger.type === "custom_event" && !definition.targeting.trigger.eventName.trim()) add({ id: "trigger-event", status: "blocking", section: "trigger", title: "Choose an event" });
    if (definition.targeting.frequency.mode === "every_time") add({ id: "frequency-every", status: "warning", section: "timing", title: "Shows whenever someone qualifies" });
    if (definition.targeting.interruptPolicy === "interrupt") add({ id: "interrupt", status: "warning", section: "behavior", title: "May replace another experience" });
  }
  if (!targeting.schedule?.endsAt) add({ id: "schedule-open", status: "warning", section: "timing", title: "No end date" });
  if (targeting.schedule?.startsAt && targeting.schedule.endsAt && targeting.schedule.startsAt >= targeting.schedule.endsAt) add({ id: "schedule-invalid", status: "blocking", section: "timing", title: "End time must be after the start time" });

  if (isGuideDefinition(definition)) {
    definition.steps.forEach((step, index) => {
      if (guideStepRequiresTarget(step) && !step.target) add({ id: `guide-target-${step.id}`, status: "blocking", section: "steps", title: `Step ${index + 1} needs an element`, description: step.content.heading });
      else if (step.target?.reliability === "fragile") add({ id: `guide-fragile-${step.id}`, status: "warning", section: "steps", title: `Step ${index + 1} has a fragile target`, description: step.content.heading });
    });
  } else if (isChecklistDefinition(definition)) {
    if (!definition.items.length) add({ id: "checklist-empty", status: "blocking", section: "checklist", title: "Add at least one task" });
    definition.items.forEach((item, index) => {
      if (!item.title.trim()) add({ id: `checklist-title-${item.id}`, status: "blocking", section: "checklist", title: `Task ${index + 1} needs a title` });
      if ((item.action.type === "navigate" || item.action.type === "open_url") && !item.action.url.trim()) add({ id: `checklist-url-${item.id}`, status: "blocking", section: "checklist", title: `Task ${index + 1} needs a URL` });
      if (item.action.type === "launch_guide") {
        const guide = guideById.get(item.action.experienceId);
        if (!guide) add({ id: `checklist-guide-${item.id}`, status: "blocking", section: "checklist", title: `Task ${index + 1} needs a valid Guide` });
        else if (guide.status !== "published" || !guide.publishedVersionId) add({ id: `checklist-guide-live-${item.id}`, status: "blocking", section: "checklist", title: `Publish the Guide used by task ${index + 1}` });
      }
      if (item.completion.type === "segment" && !segmentIds.has(item.completion.segmentId)) add({ id: `checklist-segment-${item.id}`, status: "blocking", section: "checklist", title: `Task ${index + 1} needs a valid completion Segment` });
      if (item.completion.type === "guide_completed" && !guideById.has(item.completion.experienceId)) add({ id: `checklist-completion-guide-${item.id}`, status: "blocking", section: "checklist", title: `Task ${index + 1} needs a valid completion Guide` });
    });
  } else if (isWidgetDefinition(definition)) {
    if ((experience.widgetType === "anchored_card" || experience.widgetType === "hotspot") && !definition.target) add({ id: "widget-target", status: "blocking", section: "behavior", title: "Choose an element for this widget" });
    else if (definition.target?.reliability === "fragile") add({ id: "widget-fragile", status: "warning", section: "behavior", title: "The selected element may be unreliable" });
    if (definition.survey) {
      const questionCount = definition.survey.steps.reduce((count, step) => count + step.questions.length, 0);
      if (!definition.survey.steps.length || questionCount === 0) add({ id: "survey-questions", status: "blocking", section: "content", title: "Add at least one Survey question" });
      if (!definition.survey.submitLabel.trim()) add({ id: "survey-submit", status: "blocking", section: "content", title: "Add a submit button label" });
    }
  }

  if (isBroadLaunch(definition)) add({ id: "broad-launch", status: "warning", section: "audience", title: "Broad automatic targeting", description: "This experience can appear automatically to every eligible visitor across your entire site." });
  if (!checks.some((check) => check.status === "blocking")) add({ id: "ready", status: "ready", section: "content", title: "Ready to publish", description: "Client-side launch checks passed. The server will validate again before publishing." });
  return checks;
}

export function widgetLabel(experience: Pick<Experience, "kind" | "widgetType">): string {
  if (experience.kind === "guide") return "guide";
  if (experience.kind === "checklist") return "checklist";
  return experience.widgetType === "survey" ? "survey" : (experience.widgetType ?? "widget").replaceAll("_", " ");
}

export function guidePatternLabel(pattern: ReturnType<typeof getGuideStepPattern>) { return pattern === "modal" ? "Modal" : "Anchored Card"; }

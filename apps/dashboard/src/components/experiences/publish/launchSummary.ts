import type { PageDefinition, Segment } from "../../../types/api";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { isChecklistDefinition } from "../../../types/experiences";
import { matchingPage, widgetLabel } from "./launchReadiness";

export function audienceLabel(definition: ExperienceDefinition, segments: Segment[]): string {
  const audience = definition.targeting.audience;
  if (audience.type === "all") return "Everyone";
  if (audience.type === "segment") return segments.find((segment) => segment.id === audience.segmentId)?.name ?? "Missing Segment";
  return `${audience.conditions.length} combined Segment rule${audience.conditions.length === 1 ? "" : "s"}`;
}

export function pageLabel(definition: ExperienceDefinition, pages: PageDefinition[]): string {
  return matchingPage(definition, pages)?.name ?? (definition.targeting.pageRules.length ? "Selected page rules" : "All pages");
}

export function triggerLabel(definition: ExperienceDefinition): string {
  if (isChecklistDefinition(definition)) return "Available on matching pages";
  if (definition.targeting.trigger.type === "page_load") return "When the user reaches the page";
  if (definition.targeting.trigger.type === "custom_event") return `When ${definition.targeting.trigger.eventName || "an event"} happens`;
  return "Only when another action launches it";
}

export function frequencyLabel(definition: ExperienceDefinition): string {
  if (isChecklistDefinition(definition)) return "Remains available until dismissed";
  return definition.targeting.frequency.mode === "once" ? "Only once" : definition.targeting.frequency.mode === "once_per_session" ? "Once per session" : "Whenever they qualify";
}

export function scheduleLabel(definition: ExperienceDefinition): string {
  const { schedule } = definition.targeting;
  const start = schedule?.startsAt ? new Date(schedule.startsAt).toLocaleString() : "Immediately";
  const end = schedule?.endsAt ? new Date(schedule.endsAt).toLocaleString() : "No end date";
  return `${start} · ${end}`;
}

export function launchSummary(experience: Pick<Experience, "kind" | "widgetType">, definition: ExperienceDefinition, pages: PageDefinition[], segments: Segment[]): string {
  const type = widgetLabel(experience);
  const audience = audienceLabel(definition, segments).toLowerCase() === "everyone" ? "all users" : `users in ${audienceLabel(definition, segments)}`;
  const page = pageLabel(definition, pages);
  const frequency = frequencyLabel(definition).toLowerCase();
  if (isChecklistDefinition(definition)) return `This ${type} will be available to ${audience} on ${page} and ${frequency}.`;
  return `This ${type} will appear ${frequency} to ${audience} on ${page}. ${triggerLabel(definition)}. It will start ${definition.targeting.schedule?.startsAt ? new Date(definition.targeting.schedule.startsAt).toLocaleString() : "immediately"}.`;
}

import type {
  Experience, ExperienceDefinition, ExperienceTarget, GuideAdvance, GuideStep, SurveyBranchRule,
  SurveyConfig, SurveyQuestion, SurveyStep, WidgetType,
} from "../../../types/experiences";
import { getGuideStepPattern, isChecklistDefinition, isGuideDefinition, isWidgetDefinition } from "../../../types/experiences";

export const START = "flow:start";
export const END = "flow:end";

export const widgetNames: Record<WidgetType, string> = {
  anchored_card: "Tooltip", banner: "Banner", cursor_follow: "Cursor card", hotspot: "Hotspot",
  modal: "Modal", slideout: "Slideout", survey: "Survey slide", toast: "Toast",
};

export const advanceNames: Record<GuideAdvance["type"], string> = {
  button: "Guide button", element_click: "Element click", element_hover: "Element hover",
  custom_event: "Custom event", route: "Route change",
};

export const branchOperators: Record<SurveyBranchRule["operator"], string> = {
  equals: "is", not_equals: "is not", includes: "includes", gte: "is at least",
  lte: "is at most", answered: "is answered",
};

export type FlowStep = {
  id: string;
  stepId?: string;
  label: string;
  format: string;
  target?: ExperienceTarget;
  needsTarget?: boolean;
  index?: number;
};

export type FlowConnection =
  | { id: string; from: string; to: string; label?: string; kind: "start" }
  | { id: string; from: string; to: string; label: string; kind: "guide"; stepId: string }
  | { id: string; from: string; to: string; label: string; kind: "default"; stepId: string; invalid?: boolean }
  | { id: string; from: string; to: string; label: string; kind: "rule"; stepId: string; order: number; lane: number; invalid?: boolean };

export const stepNodeId = (id: string) => `step:${id}`;

export function projectFlow(experience: Experience, definition: ExperienceDefinition): {
  steps: FlowStep[];
  connections: FlowConnection[];
  terminal?: string;
} {
  if (experience.guidedCapturePending) return { steps: [], connections: [] };
  if (isGuideDefinition(definition)) {
    const steps = definition.steps.map((step, index) => ({
      id: stepNodeId(step.id), stepId: step.id, index,
      label: step.label || step.content.heading || `Step ${index + 1}`,
      format: getGuideStepPattern(step) === "modal" ? "Modal" : "Anchored card",
      target: step.target, needsTarget: getGuideStepPattern(step) === "anchored_card",
    }));
    if (!steps.length) return { steps, connections: [] };
    return {
      steps, terminal: "Complete",
      connections: [
        { id: START, from: START, to: steps[0].id, kind: "start" },
        ...definition.steps.map((step, index): FlowConnection => ({
          id: `advance:${step.id}`, from: steps[index].id, to: steps[index + 1]?.id ?? END,
          label: step.advance?.type === "custom_event" ? step.advance.eventName : advanceNames[step.advance?.type ?? "button"],
          kind: "guide", stepId: step.id,
        })),
      ],
    };
  }
  if (isWidgetDefinition(definition) && definition.survey) {
    const survey = definition.survey;
    const steps = survey.steps.map((step, index) => ({
      id: stepNodeId(step.id), stepId: step.id, index,
      label: step.content.heading || `Slide ${index + 1}`, format: "Survey slide",
    }));
    if (!steps.length) return { steps, connections: [] };
    const positions = new Map(steps.map((step, index) => [step.stepId, index]));
    const connections: FlowConnection[] = [{ id: START, from: START, to: steps[0].id, kind: "start" }];
    const occupiedLanes: number[] = [];
    survey.steps.forEach((step, index) => {
      const destination = (id: string | undefined) => {
        const position = id === "submit" ? steps.length : id ? positions.get(id) : index + 1;
        const invalid = position === undefined || position <= index;
        return { to: invalid ? END : steps[position]?.id ?? END, invalid };
      };
      const from = steps[index].id;
      connections.push({
        id: `default:${step.id}`, from, ...destination(step.branching?.defaultNextStepId),
        kind: "default", stepId: step.id, label: "Default",
      });
      step.branching?.rules.forEach((rule, order) => {
        const target = destination(rule.nextStepId);
        const end = positions.get(rule.nextStepId) ?? steps.length;
        const firstFreeLane = occupiedLanes.findIndex(lastEnd => lastEnd < index);
        const lane = firstFreeLane < 0 ? occupiedLanes.length : firstFreeLane;
        occupiedLanes[lane] = Math.max(end, index);
        const error = branchRuleError(survey, index, rule);
        connections.push({
          id: `rule:${step.id}:${order}`, from, ...target, invalid: !!error,
          kind: "rule", order, lane, stepId: step.id, label: error ? "Invalid rule" : branchLabel(step, rule),
        });
      });
    });
    return { steps, terminal: "Submit", connections };
  }
  if (isChecklistDefinition(definition)) return {
    steps: [{ id: "widget", label: definition.title || experience.name, format: "Checklist" }], connections: [],
  };
  if (isWidgetDefinition(definition) && experience.widgetType && experience.widgetType !== "geo_agent") {
    const type = experience.widgetType;
    return {
      steps: [{
        id: "widget", label: definition.content.heading || experience.name, format: widgetNames[type],
        target: definition.target, needsTarget: type === "anchored_card" || type === "hotspot",
      }],
      connections: [],
    };
  }
  return { steps: [], connections: [] };
}

function branchLabel(step: SurveyStep, rule: SurveyBranchRule) {
  const question = step.questions.find(item => item.id === rule.questionId);
  const option = question && "options" in question ? question.options.find(item => item.id === rule.value)?.label : undefined;
  return [question?.label, branchOperators[rule.operator], option ?? rule.value].filter(value => value !== undefined).join(" ");
}

export function validOperators(question: SurveyQuestion): SurveyBranchRule["operator"][] {
  if (question.type === "multiple_choice") return ["includes", "answered"];
  if (question.type === "rating" || question.type === "nps") return ["equals", "not_equals", "gte", "lte", "answered"];
  return ["equals", "not_equals", "answered"];
}

function forwardDestination(survey: SurveyConfig, index: number, id: string) {
  return id === "submit" || survey.steps.findIndex(step => step.id === id) > index;
}

function branchRuleError(survey: SurveyConfig, index: number, rule: SurveyBranchRule): string | undefined {
  const question = survey.steps[index].questions.find(item => item.id === rule.questionId);
  if (!question) return "Select a question on this slide.";
  if (!forwardDestination(survey, index, rule.nextStepId)) return "Choose a later slide or Submit.";
  if (!validOperators(question).includes(rule.operator)) return "Choose a condition supported by this question.";
  if (rule.operator === "answered") return rule.value === undefined ? undefined : "Answered conditions have no comparison value.";
  if ("options" in question) return question.options.some(option => option.id === rule.value) ? undefined : "Select an existing answer option.";
  if (question.type === "rating" || question.type === "nps") {
    const [min, max] = question.type === "nps" ? [0, 10] : [question.min, question.max];
    if (typeof rule.value === "number" && Number.isInteger(rule.value) && rule.value >= min && rule.value <= max) return;
    return `Enter a whole number from ${min} to ${max}.`;
  }
  return typeof rule.value === "string" && rule.value.length <= 10000 ? undefined : "Enter a valid text value.";
}

export function surveyFlowError(survey: SurveyConfig): string | undefined {
  for (const [index, step] of survey.steps.entries()) {
    const branching = step.branching;
    if (!branching) continue;
    if (branching.defaultNextStepId !== undefined && !forwardDestination(survey, index, branching.defaultNextStepId))
      return `Slide ${index + 1} needs a later default destination or Submit.`;
    if (branching.rules.length > 10) return `Slide ${index + 1} supports up to 10 rules.`;
    for (const rule of branching.rules) {
      const error = branchRuleError(survey, index, rule);
      if (error) return `Slide ${index + 1}. ${error}`;
    }
  }
}

export function moveStep<T>(steps: T[], index: number, delta: -1 | 1): T[] {
  const destination = index + delta;
  if (index < 0 || index >= steps.length || destination < 0 || destination >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function guideStepPage(step: GuideStep | undefined): string | undefined {
  if (!step) return;
  const target = step.target?.targetContext?.pagePath;
  if (target) return target;
  if (step.advance?.type === "element_click" || step.advance?.type === "element_hover")
    return step.advance.target?.targetContext?.pagePath;
}

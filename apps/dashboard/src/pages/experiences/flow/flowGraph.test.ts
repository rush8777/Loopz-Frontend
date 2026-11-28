import { describe, expect, it } from "vitest";
import type { Experience, ExperienceDefinition, GuideStep, SurveyConfig } from "../../../types/experiences";
import { END, START, moveStep, projectFlow, stepNodeId, surveyFlowError } from "./flowGraph";

const targeting = { pageRules: [], audience: { type: "all" as const }, trigger: { type: "manual" as const }, frequency: { mode: "once" as const }, priority: 0 };
const design = { width: "md" as const, theme: { background: "#fff", foreground: "#222", primary: "#206f75", borderRadius: "md" as const } };
const content = { heading: "Welcome", body: "Get set up." };
const guideExperience = { id: "guide", kind: "guide", name: "Welcome", widgetType: null } as Experience;
const surveyExperience = { ...guideExperience, kind: "widget", widgetType: "survey" } as Experience;
const first: GuideStep = { id: "first", content, pattern: "modal", behavior: { dismissible: true } };
const second: GuideStep = { ...first, id: "second", label: "Finish", advance: { type: "custom_event", eventName: "finished" } };
const survey: SurveyConfig = {
  showProgress: true, allowBack: true, submitLabel: "Send",
  steps: [
    {
      id: "a", content, questions: [{ id: "q", type: "multiple_choice", label: "Your role", options: [{ id: "owner", label: "Owner" }] }],
      branching: { rules: [{ questionId: "q", operator: "includes", value: "owner", nextStepId: "c" }] },
    },
    { id: "b", content, questions: [] },
    { id: "c", content, questions: [] },
  ],
};
const surveyDefinition: ExperienceDefinition = { design, targeting, content, behavior: { dismissible: true }, survey };

describe("Experience flow projection", () => {
  it("uses step IDs and leaves the runtime order unchanged", () => {
    const source = { design, targeting, steps: [first, second] };
    const changed = projectFlow(guideExperience, { ...source, steps: moveStep(source.steps, 1, -1) });
    expect(changed.steps.map(step => step.id)).toEqual([stepNodeId("second"), stepNodeId("first")]);
    expect(changed.connections.map(edge => [edge.from, edge.to, edge.label])).toEqual([
      [START, stepNodeId("second"), undefined],
      [stepNodeId("second"), stepNodeId("first"), "finished"],
      [stepNodeId("first"), END, "Guide button"],
    ]);
    expect(source.steps).toEqual([first, second]);
  });

  it("projects the placeholder as an empty Guided Capture canvas", () => {
    expect(projectFlow({ ...guideExperience, guidedCapturePending: true }, { design, targeting, steps: [first] }))
      .toEqual({ steps: [], connections: [] });
  });

  it("shows implicit defaults alongside ordered answer branches and explicit Submit", () => {
    const graph = projectFlow(surveyExperience, surveyDefinition);
    expect(graph.terminal).toBe("Submit");
    expect(graph.connections.find(edge => edge.id === "default:a")).toMatchObject({ to: stepNodeId("b"), kind: "default" });
    expect(graph.connections.find(edge => edge.id === "rule:a:0")).toMatchObject({ to: stepNodeId("c"), label: "Your role includes Owner", order: 0 });
    expect(graph.connections.find(edge => edge.id === "default:c")).toMatchObject({ to: END });
  });

  it("rejects reordering that makes a saved survey branch go backward", () => {
    expect(surveyFlowError(survey)).toBeUndefined();
    const rearranged = { ...survey, steps: moveStep(survey.steps, 0, 1).reverse() };
    expect(surveyFlowError(rearranged)).toMatch(/later slide or Submit/);
  });

  it("flags missing destinations, deleted answers and unsupported conditions", () => {
    const withRule = (patch: Partial<NonNullable<SurveyConfig["steps"][number]["branching"]>["rules"][number]>) => {
      const step = survey.steps[0];
      return { ...survey, steps: [{ ...step, branching: { rules: [{ ...step.branching!.rules[0], ...patch }] } }, ...survey.steps.slice(1)] };
    };
    expect(surveyFlowError(withRule({ nextStepId: "deleted" }))).toMatch(/later slide/);
    expect(surveyFlowError(withRule({ value: "deleted" }))).toMatch(/existing answer option/);
    expect(surveyFlowError(withRule({ questionId: "deleted" }))).toMatch(/question on this slide/);
    expect(surveyFlowError(withRule({ operator: "gte" }))).toMatch(/supported by this question/);
  });

  it("provides exactly one node and no connectors for standalone views", () => {
    const { survey: _survey, ...widget } = surveyDefinition;
    const graph = projectFlow({ ...surveyExperience, widgetType: "banner" }, widget);
    expect(graph.steps).toEqual([expect.objectContaining({ id: "widget", format: "Banner" })]);
    expect(graph.connections).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { getLaunchChecks, isBroadLaunch } from "./launchReadiness";
import { specificSummary } from "./ReviewPublishDialog";

const experience = { kind: "widget", widgetType: "modal" } as Experience;
const definition: ExperienceDefinition = {
  content: { heading: "Welcome", body: "Hello" },
  design: { width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } },
  behavior: { dismissible: true, modalLayout: "center" },
  targeting: { pageRules: [], audience: { type: "all" }, trigger: { type: "page_load" }, frequency: { mode: "once" }, priority: 0 },
};
const references = { pages: [], segments: [], events: [], guides: [] };

describe("launch readiness", () => {
  it("treats broad automatic targeting as a warning rather than a blocking error", () => {
    const checks = getLaunchChecks(experience, definition, references);
    expect(isBroadLaunch(definition)).toBe(true);
    expect(checks).toContainEqual(expect.objectContaining({ id: "broad-launch", status: "warning" }));
    expect(checks.some((check) => check.status === "blocking")).toBe(false);
  });

  it("blocks a Guide step that is missing its required anchored target", () => {
    const guideDefinition: ExperienceDefinition = { steps: [{ id: "step_1", content: { heading: "Choose a plan", body: "" }, behavior: { dismissible: true } }], design: definition.design, targeting: definition.targeting };
    const checks = getLaunchChecks({ kind: "guide", widgetType: null }, guideDefinition, references);
    expect(checks).toContainEqual(expect.objectContaining({ id: "guide-target-step_1", status: "blocking", section: "steps" }));
  });

  it("summarizes Survey questions and Checklist tasks from their structured definitions", () => {
    const surveyDefinition: ExperienceDefinition = { ...definition, survey: { showProgress: true, allowBack: true, submitLabel: "Send", steps: [{ id: "s1", content: { heading: "One", body: "" }, questions: [{ id: "q1", type: "nps", label: "Recommend?" }] }, { id: "s2", content: { heading: "Two", body: "" }, questions: [{ id: "q2", type: "short_text", label: "Why?" }] }] } };
    expect(specificSummary({ kind: "widget", widgetType: "survey" } as Experience, surveyDefinition)).toBe("2 steps · 2 questions");
    const checklistDefinition: ExperienceDefinition = { title: "Setup", items: [{ id: "i1", title: "Visit billing", action: { type: "navigate", url: "/billing" }, completion: { type: "item_clicked" } }, { id: "i2", title: "Finish guide", action: { type: "none" }, completion: { type: "item_clicked" } }], behavior: { position: "bottom-right", order: "sequential", dismissible: true, initialState: "expanded", showRemainingCount: true }, completionMessage: { title: "Done", acknowledgeLabel: "Close" }, targeting: { pageRules: [], audience: { type: "all" }, priority: 0 }, builder: { version: 1, projectData: {}, html: '<section class="movecues-widget"></section>', css: ".movecues-widget{}" } };
    expect(specificSummary({ kind: "checklist", widgetType: null } as Experience, checklistDefinition)).toBe("2 tasks · In order");
  });
});

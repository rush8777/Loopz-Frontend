import { describe, expect, it } from "vitest";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { getLaunchChecks, isBroadLaunch } from "./launchReadiness";
import { specificSummary } from "./ReviewPublishDialog";

type GuideDefinition = Extract<ExperienceDefinition, { steps: unknown[] }>;
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
    const checklistDefinition: ExperienceDefinition = { title: "Setup", items: [{ id: "i1", title: "Visit billing", action: { type: "navigate", url: "/billing" }, completion: { type: "item_clicked" } }, { id: "i2", title: "Finish guide", action: { type: "none" }, completion: { type: "item_clicked" } }], behavior: { position: "bottom-right", order: "sequential", dismissible: true, initialState: "expanded", showRemainingCount: true }, completionMessage: { title: "Done", acknowledgeLabel: "Close" }, targeting: { pageRules: [], audience: { type: "all" }, priority: 0 }, builder: { version: 1, projectData: {}, html: '<section class="movcues-widget"></section>', css: ".movcues-widget{}" } };
    expect(specificSummary({ kind: "checklist", widgetType: null } as Experience, checklistDefinition)).toBe("2 tasks · In order");
  });
});

 describe("Guide step behavior readiness", () => {
  const guide = (): GuideDefinition => ({ steps: [{ id: "welcome", pattern: "modal", content: { heading: "Welcome", body: "" }, behavior: { dismissible: true }, advance: { type: "button" } }, { id: "feature", pattern: "anchored_card", content: { heading: "Feature", body: "" }, behavior: { dismissible: true }, target: { primarySelector: "#anchor", fallbackSelectors: [], reliability: "reliable" }, advance: { type: "element_click", target: { primarySelector: "#action", fallbackSelectors: [], reliability: "reliable" } }, presentation: { delayMs: 300, missingTarget: { action: "dismiss", timeoutMs: 2000 } } }], design: definition.design, targeting: definition.targeting });
  const blocking = (value: GuideDefinition) => getLaunchChecks({ kind: "guide", widgetType: null }, value, references).filter(check => check.status === "blocking");
  it("accepts independent interaction targets and optional presentation settings", () => { expect(blocking(guide())).toEqual([]); });
  it.each(["hover", "event", "route", "delay", "fallback", "modal", "duplicate"])("identifies the step with invalid %s settings", kind => {
    const value = guide(); const step = value.steps[1];
    if (kind === "hover") step.advance = { type: "element_hover", durationMs: 99 };
    if (kind === "event") step.advance = { type: "custom_event", eventName: "bad\nevent" };
    if (kind === "route") step.advance = { type: "route", pageRules: [] };
    if (kind === "delay") step.presentation = { delayMs: 30001 };
    if (kind === "fallback") step.presentation = { missingTarget: { action: "skip", timeoutMs: 500 } };
    if (kind === "modal") { step.pattern = "modal"; step.advance = { type: "element_hover" }; }
    if (kind === "duplicate") step.id = value.steps[0].id;
    expect(blocking(value)).toContainEqual(expect.objectContaining({ title: expect.stringContaining("Step 2:") }));
  });
 });

import { describe, expect, it } from "vitest";
import type { Component, Editor } from "grapesjs";
import type { SurveyQuestion } from "../../types/experiences";
import { syncChecklistComponents } from "./checklistComponentSync";
import { syncSurveyComponents } from "./surveyComponentSync";

class MiniComponent {
  readonly node: Node;
  private values = new Map<string, unknown>();
  private readonly cache: Map<Node, MiniComponent>;
  constructor(node: Node, cache = new Map<Node, MiniComponent>()) { this.node = node; this.cache = cache; cache.set(node, this); }
  private wrap(node: Node): MiniComponent { return this.cache.get(node) ?? new MiniComponent(node, this.cache); }
  get(key: string): unknown { if (key === "tagName") return this.node instanceof Element ? this.node.tagName.toLowerCase() : undefined; if (key === "type") return this.node.nodeType === Node.TEXT_NODE ? "textnode" : this.values.get(key); if (key === "content") return this.node.textContent ?? ""; return this.values.get(key); }
  set(key: string | Record<string, unknown>, value?: unknown): this { if (typeof key === "string") this.values.set(key, value); else Object.entries(key).forEach(([name, next]) => this.values.set(name, next)); return this; }
  getView(): { render: () => void } { return { render: () => { if (this.values.has("content")) this.node.textContent = String(this.values.get("content") ?? ""); } }; }
  is(type: string): boolean { return type === "textnode" && this.node.nodeType === Node.TEXT_NODE; }
  getClasses(): string[] { return this.node instanceof Element ? [...this.node.classList] : []; }
  addClass(value: string | string[]): this { if (this.node instanceof Element) this.node.classList.add(...(Array.isArray(value) ? value : value.split(/\s+/)).filter(Boolean)); return this; }
  removeClass(value: string | string[]): this { if (this.node instanceof Element) this.node.classList.remove(...(Array.isArray(value) ? value : value.split(/\s+/)).filter(Boolean)); return this; }
  getAttributes(): Record<string, string> { return this.node instanceof Element ? Object.fromEntries([...this.node.attributes].map(attribute => [attribute.name, attribute.value])) : {}; }
  addAttributes(value: Record<string, string>): this { return this.setAttributes({ ...this.getAttributes(), ...value }); }
  setAttributes(value: Record<string, string>): this { if (this.node instanceof Element) { [...this.node.attributes].forEach(attribute => this.node instanceof Element && this.node.removeAttribute(attribute.name)); Object.entries(value).forEach(([name, next]) => this.node instanceof Element && this.node.setAttribute(name, next)); } return this; }
  find(selector: string): Component[] { return this.node instanceof Element ? [...this.node.querySelectorAll(selector)].map(node => this.wrap(node) as unknown as Component) : []; }
  parent(): Component | null { return this.node.parentNode ? this.wrap(this.node.parentNode) as unknown as Component : null; }
  components(): { forEach: (callback: (component: Component) => void) => void; indexOf: (component: Component) => number } { const children = [...this.node.childNodes]; return { forEach: callback => children.forEach(node => callback(this.wrap(node) as unknown as Component)), indexOf: component => children.indexOf((component as unknown as MiniComponent).node as ChildNode) }; }
  append(markup: string, options?: { at?: number }): this { const template = document.createElement("template"); template.innerHTML = markup; const nodes = [...template.content.childNodes]; const reference = options?.at === undefined ? null : this.node.childNodes.item(options.at); nodes.forEach(node => this.node.insertBefore(node, reference)); return this; }
  remove(): this { this.node.parentNode?.removeChild(this.node); return this; }
  index(): number { return this.node.parentNode ? [...this.node.parentNode.childNodes].indexOf(this.node as ChildNode) : -1; }
  move(parent: Component, options: { at: number }): this { const target = (parent as unknown as MiniComponent).node; const reference = target.childNodes.item(options.at); target.insertBefore(this.node as ChildNode, reference); return this; }
}

function fixture(html: string): { editor: Editor; root: HTMLElement } {
  const template = document.createElement("template"); template.innerHTML = html; const root = template.content.firstElementChild as HTMLElement;
  const rootComponent = new MiniComponent(root) as unknown as Component;
  const wrapper = { find: (selector: string) => root.matches(selector) ? [rootComponent] : [] };
  return { editor: { getWrapper: () => wrapper } as unknown as Editor, root };
}

const choices = (label: string, options: Array<[string, string]>): SurveyQuestion => ({ id: "question_1", type: "single_choice", label, required: true, options: options.map(([id, value]) => ({ id, label: value })) });

describe("non-destructive survey component synchronization", () => {
  it("preserves custom wrappers, classes, and GrapesJS style hooks across label and option edits", () => {
    const { editor, root } = fixture('<section class="movcues-widget"><div class="movcues-survey-question custom-question movcues-style--question" data-movcues-question-id="question_1" data-movcues-question-type="single_choice"><p class="movcues-survey-question__label custom-label movcues-style--label"><span class="custom-label-wrapper"><em>Old label</em></span></p><div class="custom-control-wrapper"><div class="movcues-survey-options"><button class="movcues-survey-option custom-option movcues-style--option" data-movcues-option-id="a"><span class="custom-option-wrapper">Old A</span></button><button class="movcues-survey-option remove-me" data-movcues-option-id="remove">Remove</button></div></div><aside class="custom-child">Keep me</aside></div></section>');
    syncSurveyComponents(editor, [choices("Edited label", [["a", "Edited A"], ["b", "Added B"]])]);
    expect(root.querySelector(".custom-question.movcues-style--question")).not.toBeNull();
    expect(root.querySelector(".custom-label.movcues-style--label .custom-label-wrapper em")?.textContent).toBe("Edited label");
    expect([...root.querySelector('[data-movcues-option-id="a"]')!.classList]).toEqual(expect.arrayContaining(["custom-option", "movcues-style--option"]));
    expect(root.querySelector('[data-movcues-option-id="a"] .custom-option-wrapper')?.textContent).toBe("Edited A");
    expect(root.querySelector('[data-movcues-option-id="remove"]')).toBeNull();
    expect(root.querySelector('[data-movcues-option-id="b"]')?.textContent).toBe("Added B");
    expect(root.querySelector(".custom-control-wrapper .movcues-survey-options")).not.toBeNull();
    expect(root.querySelector(".custom-child")?.textContent).toBe("Keep me");
  });

  it("treats applied custom HTML as authoritative and replaces only the functional control when the question type changes", () => {
    const { editor, root } = fixture('<section class="movcues-widget"><div class="movcues-survey-question applied-html custom-question" data-movcues-question-id="question_1" data-movcues-question-type="single_choice"><div class="custom-header"><p class="movcues-survey-question__label movcues-style--label">Choose</p></div><div class="custom-control-wrapper"><div class="movcues-survey-options"><button data-movcues-option-id="a">A</button></div></div><div class="custom-footer">Authored footer</div></div></section>');
    const question: SurveyQuestion = { id: "question_1", type: "long_text", label: "Explain", placeholder: "Details", maxLength: 120 };
    syncSurveyComponents(editor, [question]);
    const surveyQuestion = root.querySelector('[data-movcues-question-id="question_1"]')!;
    expect([...surveyQuestion.classList]).toEqual(expect.arrayContaining(["applied-html", "custom-question", "movcues-survey-question--long_text"]));
    expect(surveyQuestion.classList.contains("movcues-survey-question--single_choice")).toBe(false);
    expect(root.querySelector(".custom-header .movcues-style--label")?.textContent).toBe("Explain");
    expect(root.querySelector(".custom-footer")?.textContent).toBe("Authored footer");
    expect(root.querySelector(".movcues-survey-options")).toBeNull();
    expect(root.querySelector('.custom-control-wrapper textarea[data-movcues-question-input][placeholder="Details"][maxlength="120"]')).not.toBeNull();
  });

  it("inserts a structured question at the requested order without rebuilding customized questions or navigation", () => {
    const { editor, root } = fixture('<section class="movcues-widget"><div class="movcues-survey-question custom-first" data-movcues-question-id="question_1" data-movcues-question-type="single_choice"><p class="movcues-survey-question__label"><span class="authored-wrapper">First</span></p><div class="movcues-survey-options"><button data-movcues-option-id="a">A</button></div></div><div data-movcues-survey-question-gateway="short_text"></div><div class="movcues-survey-question custom-second" data-movcues-question-id="question_2" data-movcues-question-type="short_text"><p class="movcues-survey-question__label">Second</p><input data-movcues-question-input></div><div data-movcues-survey-controls><button data-movcues-survey-action="next">Next</button></div></section>');
    const added: SurveyQuestion = { id: "question_new", type: "rating", label: "Rate it", min: 1, max: 5 };
    syncSurveyComponents(editor, [choices("First", [["a", "A"]]), added, { id: "question_2", type: "short_text", label: "Second", placeholder: "Answer", maxLength: 250 }]);
    const ids = [...root.querySelectorAll<HTMLElement>("[data-movcues-question-id]")].map(element => element.dataset.movcuesQuestionId);
    expect(ids).toEqual(["question_1", "question_new", "question_2"]);
    expect(root.querySelector(".custom-first .authored-wrapper")?.textContent).toBe("First");
    expect(root.querySelector(".custom-second")).not.toBeNull();
    expect(root.querySelectorAll("[data-movcues-survey-controls]")).toHaveLength(1);
    expect(root.querySelectorAll('[data-movcues-question-id="question_new"]')).toHaveLength(1);
    expect(root.querySelector("[data-movcues-survey-question-gateway]")).toBeNull();
  });

  it("reorders existing question components without losing their authored wrappers", () => {
    const { editor, root } = fixture('<section class="movcues-widget"><div class="movcues-survey-question custom-first" data-movcues-question-id="question_1" data-movcues-question-type="single_choice"><p class="movcues-survey-question__label">First</p><div class="movcues-survey-options"><button data-movcues-option-id="a">A</button></div></div><div class="movcues-survey-question custom-second" data-movcues-question-id="question_2" data-movcues-question-type="short_text"><p class="movcues-survey-question__label">Second</p><input data-movcues-question-input></div><div data-movcues-survey-controls><button data-movcues-survey-action="next">Next</button></div></section>');
    syncSurveyComponents(editor, [{ id: "question_2", type: "short_text", label: "Second", placeholder: "Answer" }, choices("First", [["a", "A"]])]);
    expect([...root.querySelectorAll<HTMLElement>("[data-movcues-question-id]")].map(element => element.dataset.movcuesQuestionId)).toEqual(["question_2", "question_1"]);
    expect(root.querySelector(".custom-first")).not.toBeNull();
    expect(root.querySelector(".custom-second")).not.toBeNull();
  });
});

describe("live structured-copy synchronization", () => {
  it("repaints checklist title, description, and item copy in the canvas", () => {
    const { editor, root } = fixture('<section class="movcues-widget" data-movcues-checklist-role="root"><h2 data-movcues-checklist-role="title">Old title</h2><p data-movcues-checklist-role="description">Old description</p><span data-movcues-checklist-role="launcher-label">Old launcher</span><div data-movcues-checklist-role="completion-title">Old completion</div><div data-movcues-checklist-role="completion-description">Old completion description</div><button data-movcues-checklist-role="completion-acknowledge">Old button</button><div data-movcues-checklist-view="expanded"><div data-movcues-checklist-role="items"><button data-movcues-checklist-item-id="task-1"><span data-movcues-checklist-item-role="title">Old task</span><span data-movcues-checklist-item-role="description">Old task description</span></button></div></div></section>');

    syncChecklistComponents(
      editor,
      [{ id: "task-1", title: "Updated task", description: "Updated task description", action: { type: "none" }, completion: { type: "item_clicked" } }],
      { title: "Updated title", description: "Updated description", completionMessage: { title: "All done", description: "Finished", acknowledgeLabel: "Close" } },
    );

    expect(root.querySelector('[data-movcues-checklist-role="title"]')?.textContent).toBe("Updated title");
    expect(root.querySelector('[data-movcues-checklist-role="description"]')?.textContent).toBe("Updated description");
    expect(root.querySelector('[data-movcues-checklist-item-role="title"]')?.textContent).toBe("Updated task");
    expect(root.querySelector('[data-movcues-checklist-item-role="description"]')?.textContent).toBe("Updated task description");
  });
});

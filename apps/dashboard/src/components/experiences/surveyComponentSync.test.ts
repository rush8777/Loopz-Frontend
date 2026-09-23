import { describe, expect, it } from "vitest";
import type { Component, Editor } from "grapesjs";
import type { SurveyQuestion } from "../../types/experiences";
import { syncSurveyComponents } from "./surveyComponentSync";

class MiniComponent {
  readonly node: Node;
  private values = new Map<string, unknown>();
  constructor(node: Node) { this.node = node; }
  get(key: string): unknown { if (key === "tagName") return this.node instanceof Element ? this.node.tagName.toLowerCase() : undefined; if (key === "type") return this.node.nodeType === Node.TEXT_NODE ? "textnode" : this.values.get(key); if (key === "content") return this.node.textContent ?? ""; return this.values.get(key); }
  set(key: string | Record<string, unknown>, value?: unknown): this { if (typeof key === "string") { if (key === "content") this.node.textContent = String(value ?? ""); else this.values.set(key, value); } else Object.entries(key).forEach(([name, next]) => this.values.set(name, next)); return this; }
  is(type: string): boolean { return type === "textnode" && this.node.nodeType === Node.TEXT_NODE; }
  getClasses(): string[] { return this.node instanceof Element ? [...this.node.classList] : []; }
  addClass(value: string | string[]): this { if (this.node instanceof Element) this.node.classList.add(...(Array.isArray(value) ? value : value.split(/\s+/)).filter(Boolean)); return this; }
  removeClass(value: string | string[]): this { if (this.node instanceof Element) this.node.classList.remove(...(Array.isArray(value) ? value : value.split(/\s+/)).filter(Boolean)); return this; }
  getAttributes(): Record<string, string> { return this.node instanceof Element ? Object.fromEntries([...this.node.attributes].map(attribute => [attribute.name, attribute.value])) : {}; }
  addAttributes(value: Record<string, string>): this { return this.setAttributes({ ...this.getAttributes(), ...value }); }
  setAttributes(value: Record<string, string>): this { if (this.node instanceof Element) { [...this.node.attributes].forEach(attribute => this.node instanceof Element && this.node.removeAttribute(attribute.name)); Object.entries(value).forEach(([name, next]) => this.node instanceof Element && this.node.setAttribute(name, next)); } return this; }
  find(selector: string): Component[] { return this.node instanceof Element ? [...this.node.querySelectorAll(selector)].map(node => new MiniComponent(node) as unknown as Component) : []; }
  parent(): Component | null { return this.node.parentNode ? new MiniComponent(this.node.parentNode) as unknown as Component : null; }
  components(): { forEach: (callback: (component: Component) => void) => void; indexOf: (component: Component) => number } { const children = [...this.node.childNodes]; return { forEach: callback => children.forEach(node => callback(new MiniComponent(node) as unknown as Component)), indexOf: component => children.indexOf((component as unknown as MiniComponent).node as ChildNode) }; }
  append(markup: string, options?: { at?: number }): this { const template = document.createElement("template"); template.innerHTML = markup; const nodes = [...template.content.childNodes]; const reference = options?.at === undefined ? null : this.node.childNodes.item(options.at); nodes.forEach(node => this.node.insertBefore(node, reference)); return this; }
  remove(): this { this.node.parentNode?.removeChild(this.node); return this; }
  index(): number { return this.node.parentNode ? [...this.node.parentNode.childNodes].indexOf(this.node as ChildNode) : -1; }
  move(parent: Component, options: { at: number }): this { const target = (parent as unknown as MiniComponent).node; const reference = target.childNodes.item(options.at); target.insertBefore(this.node as ChildNode, reference); return this; }
}

function fixture(html: string): { editor: Editor; root: HTMLElement } {
  const template = document.createElement("template"); template.innerHTML = html; const root = template.content.firstElementChild as HTMLElement;
  const rootComponent = new MiniComponent(root) as unknown as Component;
  const wrapper = { find: (selector: string) => selector === ".movecues-widget" ? [rootComponent] : [] };
  return { editor: { getWrapper: () => wrapper } as unknown as Editor, root };
}

const choices = (label: string, options: Array<[string, string]>): SurveyQuestion => ({ id: "question_1", type: "single_choice", label, required: true, options: options.map(([id, value]) => ({ id, label: value })) });

describe("non-destructive survey component synchronization", () => {
  it("preserves custom wrappers, classes, and GrapesJS style hooks across label and option edits", () => {
    const { editor, root } = fixture('<section class="movecues-widget"><div class="movecues-survey-question custom-question movecues-style--question" data-movecues-question-id="question_1" data-movecues-question-type="single_choice"><p class="movecues-survey-question__label custom-label movecues-style--label"><span class="custom-label-wrapper"><em>Old label</em></span></p><div class="custom-control-wrapper"><div class="movecues-survey-options"><button class="movecues-survey-option custom-option movecues-style--option" data-movecues-option-id="a"><span class="custom-option-wrapper">Old A</span></button><button class="movecues-survey-option remove-me" data-movecues-option-id="remove">Remove</button></div></div><aside class="custom-child">Keep me</aside></div></section>');
    syncSurveyComponents(editor, [choices("Edited label", [["a", "Edited A"], ["b", "Added B"]])]);
    expect(root.querySelector(".custom-question.movecues-style--question")).not.toBeNull();
    expect(root.querySelector(".custom-label.movecues-style--label .custom-label-wrapper em")?.textContent).toBe("Edited label");
    expect([...root.querySelector('[data-movecues-option-id="a"]')!.classList]).toEqual(expect.arrayContaining(["custom-option", "movecues-style--option"]));
    expect(root.querySelector('[data-movecues-option-id="a"] .custom-option-wrapper')?.textContent).toBe("Edited A");
    expect(root.querySelector('[data-movecues-option-id="remove"]')).toBeNull();
    expect(root.querySelector('[data-movecues-option-id="b"]')?.textContent).toBe("Added B");
    expect(root.querySelector(".custom-control-wrapper .movecues-survey-options")).not.toBeNull();
    expect(root.querySelector(".custom-child")?.textContent).toBe("Keep me");
  });

  it("treats applied custom HTML as authoritative and replaces only the functional control when the question type changes", () => {
    const { editor, root } = fixture('<section class="movecues-widget"><div class="movecues-survey-question applied-html custom-question" data-movecues-question-id="question_1" data-movecues-question-type="single_choice"><div class="custom-header"><p class="movecues-survey-question__label movecues-style--label">Choose</p></div><div class="custom-control-wrapper"><div class="movecues-survey-options"><button data-movecues-option-id="a">A</button></div></div><div class="custom-footer">Authored footer</div></div></section>');
    const question: SurveyQuestion = { id: "question_1", type: "long_text", label: "Explain", placeholder: "Details", maxLength: 120 };
    syncSurveyComponents(editor, [question]);
    const surveyQuestion = root.querySelector('[data-movecues-question-id="question_1"]')!;
    expect([...surveyQuestion.classList]).toEqual(expect.arrayContaining(["applied-html", "custom-question", "movecues-survey-question--long_text"]));
    expect(surveyQuestion.classList.contains("movecues-survey-question--single_choice")).toBe(false);
    expect(root.querySelector(".custom-header .movecues-style--label")?.textContent).toBe("Explain");
    expect(root.querySelector(".custom-footer")?.textContent).toBe("Authored footer");
    expect(root.querySelector(".movecues-survey-options")).toBeNull();
    expect(root.querySelector('.custom-control-wrapper textarea[data-movecues-question-input][placeholder="Details"][maxlength="120"]')).not.toBeNull();
  });
});

import type { Component, Editor } from "grapesjs";
import type { SurveyQuestion } from "../../types/experiences";
import { surveyQuestionMarkup } from "./widgetBuilder";

type ComponentCollection = { forEach?: (callback: (component: Component) => void) => void; indexOf?: (component: Component) => number };

/**
 * Keeps structured survey data and authored GrapesJS markup in sync without
 * replacing an existing question component tree. Component identity matters:
 * GrapesJS style classes and custom wrappers live on those existing models.
 */
export function syncSurveyComponents(editor: Editor, questions: SurveyQuestion[]): void {
  const wrapper = editor.getWrapper(); const root = wrapper?.find(".movcues-widget")[0]; if (!root) return;
  ensureSurveyNavigation(root);
  root.find("[data-movcues-survey-question-gateway]").forEach(component => component.remove());
  const wanted = new Map(questions.map(question => [question.id, question]));
  const existing = root.find("[data-movcues-question-id]");
  const componentsById = new Map<string, Component>();
  const seen = new Set<string>();
  for (const component of existing) {
    const id = String(component.getAttributes()["data-movcues-question-id"] ?? "");
    const question = wanted.get(id);
    if (!question || seen.has(id)) { component.remove(); continue; }
    seen.add(id);
    componentsById.set(id, component);
    reconcileSurveyQuestion(component, question);
  }
  const action = root.find("[data-movcues-survey-action]")[0]; const actionContainer = action?.parent();
  questions.forEach((question, index) => {
    if (seen.has(question.id)) return;
    const next = questions.slice(index + 1).map(candidate => componentsById.get(candidate.id)).find((component): component is Component => Boolean(component && component.parent() === root));
    const fallback = actionContainer?.parent() === root ? collectionIndex(root.components(), actionContainer) : undefined;
    const at = next ? collectionIndex(root.components(), next) : fallback;
    root.append(surveyQuestionMarkup(question), at === undefined ? undefined : { at });
    const added = root.find(`[data-movcues-question-id="${cssAttributeEscape(question.id)}"]`)[0];
    if (added) { componentsById.set(question.id, added); seen.add(question.id); }
  });
  // Question order is structured survey state. Move the existing models rather
  // than recreating their trees so authored wrappers and styles survive a drag.
  const orderedComponents = questions.map(question => componentsById.get(question.id)).filter((component): component is Component => Boolean(component && component.parent() === root));
  const firstQuestion = orderedComponents.map(component => collectionIndex(root.components(), component)).filter((index): index is number => index !== undefined).sort((left, right) => left - right)[0];
  if (firstQuestion !== undefined) orderedComponents.forEach((component, index) => {
    if (collectionIndex(root.components(), component) !== firstQuestion + index) component.move(root, { at: firstQuestion + index });
  });
}

export function reconcileSurveyQuestion(component: Component, question: SurveyQuestion): void {
  component.set({ removable: false, copyable: false, editable: false });
  const staleTypeClasses = component.getClasses().filter(name => name.startsWith("movcues-survey-question--") && name !== `movcues-survey-question--${question.type}`);
  if (staleTypeClasses.length) component.removeClass(staleTypeClasses);
  component.addClass(["movcues-survey-question", `movcues-survey-question--${question.type}`]);
  component.addAttributes({ "data-movcues-question-id": question.id, "data-movcues-question-type": question.type });
  reconcileQuestionLabel(component, question);
  if (isOptionQuestion(question)) reconcileOptionControl(component, question);
  else reconcileTextControl(component, question);
}

function reconcileQuestionLabel(component: Component, question: SurveyQuestion): void {
  let label = component.find(".movcues-survey-question__label")[0];
  if (!label) {
    component.append(`<p class="movcues-survey-question__label">${escapeHtml(question.label)}</p>`, { at: 0 });
    label = component.find(".movcues-survey-question__label")[0];
  }
  if (!label) return;
  setFunctionalText(label, question.label);
  const required = label.find(".movcues-survey-question__required")[0];
  if (question.required && !required) label.append('<span class="movcues-survey-question__required" aria-hidden="true"> *</span>');
  if (!question.required) required?.remove();
}

function reconcileOptionControl(component: Component, question: Extract<SurveyQuestion, { type: "single_choice" | "multiple_choice" | "rating" | "nps" }>): void {
  const inputs = component.find("[data-movcues-question-input]"); const replacedInput = inputs[0]; const insertionParent = replacedInput?.parent() ?? component; const insertionIndex = replacedInput ? collectionIndex(insertionParent.components(), replacedInput) : undefined;
  inputs.forEach(input => input.remove());
  let holder = component.find(".movcues-survey-options")[0];
  if (!holder) {
    insertionParent.append(optionHolderMarkup(question), insertionIndex === undefined ? undefined : { at: insertionIndex });
    holder = component.find(".movcues-survey-options")[0];
  }
  if (!holder) return;
  const values = optionValues(question);
  const existing = new Map<string, Component>();
  holder.find("[data-movcues-option-id]").forEach(option => {
    const id = String(option.getAttributes()["data-movcues-option-id"] ?? "");
    if (!values.some(value => value.id === id) || existing.has(id)) option.remove(); else existing.set(id, option);
  });
  values.forEach((value, index) => {
    let option = existing.get(value.id);
    if (!option) {
      holder.append(optionMarkup(value.id, value.label), { at: index });
      option = holder.find(`[data-movcues-option-id="${cssAttributeEscape(value.id)}"]`)[0];
    }
    if (!option) return;
    option.addAttributes({ "data-movcues-option-id": value.id, "aria-pressed": option.getAttributes()["aria-pressed"] ?? "false", type: "button" });
    setFunctionalText(option, value.label);
    if (option.parent() === holder && option.index() !== index) option.move(holder, { at: index });
  });
}

function reconcileTextControl(component: Component, question: Extract<SurveyQuestion, { type: "short_text" | "long_text" }>): void {
  const holders = component.find(".movcues-survey-options"); const replacedHolder = holders[0]; const insertionParent = replacedHolder?.parent() ?? component; const insertionIndex = replacedHolder ? collectionIndex(insertionParent.components(), replacedHolder) : undefined;
  holders.forEach(holder => holder.remove());
  let input = component.find("[data-movcues-question-input]")[0];
  const requiredTag = question.type === "long_text" ? "textarea" : "input";
  const currentTag = String(input?.get("tagName") ?? "").toLowerCase();
  if (input && currentTag !== requiredTag) {
    const parent = input.parent() ?? component; const at = collectionIndex(parent.components(), input);
    input.remove(); parent.append(inputMarkup(question), at === undefined ? undefined : { at });
    input = component.find("[data-movcues-question-input]")[0];
  }
  if (!input) { insertionParent.append(inputMarkup(question), insertionIndex === undefined ? undefined : { at: insertionIndex }); input = component.find("[data-movcues-question-input]")[0]; }
  if (!input) return;
  const attributes: Record<string, string> = { ...input.getAttributes(), "data-movcues-question-input": "", placeholder: question.placeholder ?? "", "aria-label": question.label };
  if (question.type === "short_text") attributes.type = "text"; else delete attributes.type;
  if (question.maxLength) attributes.maxlength = String(question.maxLength); else delete attributes.maxlength;
  input.setAttributes(attributes);
}

function setFunctionalText(component: Component, text: string): void {
  const nodes = descendants(component).filter(isTextNode);
  const target = nodes.find(node => !hasAncestorClass(node, component, "movcues-survey-question__required"));
  if (target) setTextNodeContent(target, text); else component.append(escapeHtml(text), { at: 0 });
}

// GrapesJS persists a text-node `content` change immediately, but its text-node
// view does not repaint that change until it is rendered again. Without this,
// the saved HTML is correct while the canvas keeps showing the previous copy.
function setTextNodeContent(component: Component, text: string): void {
  component.set("content", text);
  component.getView()?.render();
}

function descendants(component: Component): Component[] {
  const result: Component[] = [];
  for (const child of collectionItems(component.components())) { result.push(child, ...descendants(child)); }
  return result;
}

function isTextNode(component: Component): boolean { return component.is?.("textnode") || component.get("type") === "textnode"; }
function hasAncestorClass(component: Component, boundary: Component, className: string): boolean { for (let current = component.parent(); current && current !== boundary; current = current.parent()) if (current.getClasses().includes(className)) return true; return false; }
function collectionItems(collection: ComponentCollection): Component[] { const result: Component[] = []; collection?.forEach?.(component => result.push(component)); return result; }
function collectionIndex(collection: ComponentCollection, component: Component): number | undefined { const value = collection?.indexOf?.(component); return typeof value === "number" && value >= 0 ? value : undefined; }

function isOptionQuestion(question: SurveyQuestion): question is Extract<SurveyQuestion, { type: "single_choice" | "multiple_choice" | "rating" | "nps" }> { return question.type === "single_choice" || question.type === "multiple_choice" || question.type === "rating" || question.type === "nps"; }
function optionValues(question: Extract<SurveyQuestion, { type: "single_choice" | "multiple_choice" | "rating" | "nps" }>): Array<{ id: string; label: string }> {
  if (question.type === "single_choice" || question.type === "multiple_choice") return question.options.map(option => ({ id: option.id, label: option.label }));
  const min = question.type === "rating" ? question.min : 0; const max = question.type === "rating" ? question.max : 10;
  return Array.from({ length: max - min + 1 }, (_, index) => String(min + index)).map(value => ({ id: value, label: value }));
}
function optionHolderMarkup(question: Extract<SurveyQuestion, { type: "single_choice" | "multiple_choice" | "rating" | "nps" }>): string { return `<div class="movcues-survey-options" role="group" aria-label="${escapeHtml(question.label)}">${optionValues(question).map(value => optionMarkup(value.id, value.label)).join("")}</div>`; }
function optionMarkup(id: string, label: string): string { return `<button type="button" class="movcues-survey-option" data-movcues-option-id="${escapeHtml(id)}" aria-pressed="false">${escapeHtml(label)}</button>`; }
function inputMarkup(question: Extract<SurveyQuestion, { type: "short_text" | "long_text" }>): string { const tag = question.type === "long_text" ? "textarea" : "input"; const attributes = `${question.type === "short_text" ? ' type="text"' : ""} class="movcues-survey-input" data-movcues-question-input placeholder="${escapeHtml(question.placeholder ?? "")}"${question.maxLength ? ` maxlength="${question.maxLength}"` : ""} aria-label="${escapeHtml(question.label)}"`; return tag === "textarea" ? `<textarea${attributes}></textarea>` : `<input${attributes}>`; }
function cssAttributeEscape(value: string): string { return value.replace(/["\\]/g, "\\$&"); }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!); }

function ensureSurveyNavigation(root: Component): void {
  root.set("removable", false); root.set("copyable", false);
  const controls = root.find("[data-movcues-survey-controls]")[0];
  if (controls) { controls.set("removable", false); controls.set("copyable", false); }
  for (const button of root.find("[data-movcues-survey-action]")) {
    button.set("droppable", false); button.set("editable", true); button.set("removable", true); button.set("copyable", false);
  }
}

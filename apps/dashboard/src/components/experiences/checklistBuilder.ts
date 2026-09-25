import type { ChecklistExperienceDefinition, ChecklistItem, WidgetBuilderState } from "../../types/experiences";
import { checklistItemMarkup } from "./checklistComponentSync";

export function syncChecklistBuilder(builder: WidgetBuilderState, definition: Pick<ChecklistExperienceDefinition, "title" | "description" | "items" | "completionMessage">): WidgetBuilderState {
  const documentValue = new DOMParser().parseFromString(builder.html, "text/html"); const root = documentValue.querySelector<HTMLElement>('[data-movecues-checklist-role="root"]'); if (!root) return builder;
  text(root, "title", definition.title); text(root, "description", definition.description ?? ""); text(root, "launcher-label", definition.title); text(root, "completion-title", definition.completionMessage.title); text(root, "completion-description", definition.completionMessage.description ?? ""); text(root, "completion-acknowledge", definition.completionMessage.acknowledgeLabel);
  const container = root.querySelector<HTMLElement>('[data-movecues-checklist-role="items"]'); if (!container) return builder;
  const existing = new Map(Array.from(container.querySelectorAll<HTMLElement>("[data-movecues-checklist-item-id]")).map(element => [element.dataset.movecuesChecklistItemId!, element]));
  container.replaceChildren(...definition.items.map(item => { const element = existing.get(item.id) ?? elementFromMarkup(documentValue, checklistItemMarkup(item)); setItemText(element, "title", item.title); setItemText(element, "description", item.description ?? ""); return element; }));
  return { ...builder, html: documentValue.body.innerHTML };
}

export function createChecklistItem(): ChecklistItem { return { id: `item_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`, title: "New task", description: "Describe what the user should do.", action: { type: "none" }, completion: { type: "item_clicked" } }; }
function text(root: ParentNode, role: string, value: string) { const element = root.querySelector<HTMLElement>(`[data-movecues-checklist-role="${role}"]`); if (element) element.textContent = value; }
function setItemText(root: ParentNode, role: string, value: string) { const element = root.querySelector<HTMLElement>(`[data-movecues-checklist-item-role="${role}"]`); if (element) element.textContent = value; }
function elementFromMarkup(documentValue: Document, markup: string): HTMLElement { const template = documentValue.createElement("template"); template.innerHTML = markup; return template.content.firstElementChild as HTMLElement; }

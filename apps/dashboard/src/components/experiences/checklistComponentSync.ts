import type { Component, Editor } from "grapesjs";
import type { ChecklistItem } from "../../types/experiences";

export interface ChecklistPresentationCopy {
  title: string;
  description?: string;
  completionMessage: {
    title: string;
    description?: string;
    acknowledgeLabel: string;
  };
}

const REQUIRED_CHECKLIST_ROLES = ["title", "description", "progress", "items", "launcher-label", "remaining-count", "completion-title", "completion-description", "completion-acknowledge"] as const;
const REQUIRED_CHECKLIST_VIEWS = ["expanded", "launcher", "completion"] as const;
const REQUIRED_ITEM_ROLES = ["state", "title", "description"] as const;

/** Validates the authored markup against the hooks consumed by ChecklistRenderer. */
export function validateChecklistBuilderHtml(html: string, items: ChecklistItem[]): void {
  const documentValue = new DOMParser().parseFromString(html, "text/html");
  const roots = Array.from(documentValue.querySelectorAll<HTMLElement>('[data-movecues-checklist-role="root"]'));
  if (roots.length !== 1 || !roots[0].classList.contains("movecues-widget")) throw new Error("Checklist HTML must contain exactly one .movecues-widget root.");
  const root = roots[0];
  for (const role of REQUIRED_CHECKLIST_ROLES) requireExactlyOne(root, `[data-movecues-checklist-role="${role}"]`, `checklist role “${role}”`);
  for (const view of REQUIRED_CHECKLIST_VIEWS) requireExactlyOne(root, `[data-movecues-checklist-view="${view}"]`, `checklist view “${view}”`);
  const container = root.querySelector<HTMLElement>('[data-movecues-checklist-role="items"]')!;
  const itemElements = Array.from(root.querySelectorAll<HTMLElement>("[data-movecues-checklist-item-id]"));
  const expectedIds = new Set(items.map(item => item.id));
  for (const element of itemElements) {
    const itemId = element.dataset.movecuesChecklistItemId ?? "";
    if (!expectedIds.has(itemId)) throw new Error(`Checklist HTML contains an unknown task marker: ${itemId || "(empty)"}.`);
    if (element.parentElement !== container) throw new Error(`Checklist task ${itemId} must be a direct child of the items container.`);
    for (const role of REQUIRED_ITEM_ROLES) requireExactlyOne(element, `[data-movecues-checklist-item-role="${role}"]`, `task ${itemId} role “${role}”`);
  }
  for (const item of items) {
    if (itemElements.filter(element => element.dataset.movecuesChecklistItemId === item.id).length !== 1) throw new Error(`Checklist task ${item.id} must appear exactly once.`);
  }
}

export function checklistItemMarkup(item: ChecklistItem): string {
  return `<button type="button" class="movecues-checklist__item" data-movecues-checklist-item-id="${escapeHtml(item.id)}" data-movecues-checklist-role="item"><span class="movecues-checklist__state" data-movecues-checklist-item-role="state">✓</span><span class="movecues-checklist__copy"><span class="movecues-checklist__item-title" data-movecues-checklist-item-role="title">${escapeHtml(item.title)}</span><span class="movecues-checklist__item-description" data-movecues-checklist-item-role="description">${escapeHtml(item.description ?? "")}</span></span></button>`;
}

/** Projects structured task copy/order while retaining every existing GrapesJS component model. */
export function syncChecklistComponents(editor: Editor, items: ChecklistItem[], copy?: ChecklistPresentationCopy): void {
  const root = editor.getWrapper()?.find('[data-movecues-checklist-role="root"]')[0]; const container = root?.find('[data-movecues-checklist-role="items"]')[0]; if (!root || !container) return;
  protect(root, false); protect(container, false);
  if (copy) {
    setSemanticText(root, "title", copy.title);
    setSemanticText(root, "description", copy.description ?? "");
    setSemanticText(root, "launcher-label", copy.title);
    setSemanticText(root, "completion-title", copy.completionMessage.title);
    setSemanticText(root, "completion-description", copy.completionMessage.description ?? "");
    setSemanticText(root, "completion-acknowledge", copy.completionMessage.acknowledgeLabel);
  }
  for (const component of root.find("[data-movecues-checklist-view]")) protect(component, false);
  const wanted = new Map(items.map(item => [item.id, item])); const existing = new Map<string, Component>();
  for (const component of container.find("[data-movecues-checklist-item-id]")) { const id = String(component.getAttributes()["data-movecues-checklist-item-id"] ?? ""); if (!wanted.has(id) || existing.has(id)) component.remove(); else existing.set(id, component); }
  items.forEach((item, index) => {
    let component = existing.get(item.id);
    if (!component) { container.append(checklistItemMarkup(item), { at: index }); component = container.find(`[data-movecues-checklist-item-id="${cssEscape(item.id)}"]`)[0]; }
    if (!component) return; protect(component, false); setRoleText(component, "title", item.title); setRoleText(component, "description", item.description ?? "");
    if (component.parent() === container && component.index() !== index) component.move(container, { at: index });
  });
}

function protect(component: Component, droppable: boolean) { component.set({ removable: false, copyable: false, draggable: false, droppable, editable: false }); }
function requireExactlyOne(root: ParentNode, selector: string, label: string) { if (root.querySelectorAll(selector).length !== 1) throw new Error(`Checklist HTML must contain exactly one ${label}.`); }
function setRoleText(component: Component, role: string, value: string) { const holder = component.find(`[data-movecues-checklist-item-role="${role}"]`)[0]; if (!holder) return; const text = descendants(holder).find(node => node.is?.("textnode") || node.get("type") === "textnode"); if (text) setTextNodeContent(text, value); else holder.append(escapeHtml(value)); }
function setSemanticText(component: Component, role: string, value: string) { const holder = component.find(`[data-movecues-checklist-role="${role}"]`)[0]; if (!holder) return; const text = descendants(holder).find(node => node.is?.("textnode") || node.get("type") === "textnode"); if (text) setTextNodeContent(text, value); else holder.append(escapeHtml(value)); }
// Keep the iframe view aligned with the model. GrapesJS serializes `content`
// correctly but does not repaint ComponentTextNode views on that change alone.
function setTextNodeContent(component: Component, value: string) { component.set("content", value); component.getView()?.render(); }
function descendants(component: Component): Component[] { const values: Component[] = []; component.components()?.forEach?.((child: Component) => values.push(child, ...descendants(child))); return values; }
function cssEscape(value: string) { return value.replace(/["\\]/g, "\\$&"); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]!)); }

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
function setRoleText(component: Component, role: string, value: string) { const holder = component.find(`[data-movecues-checklist-item-role="${role}"]`)[0]; if (!holder) return; const text = descendants(holder).find(node => node.is?.("textnode") || node.get("type") === "textnode"); if (text) text.set("content", value); else holder.append(escapeHtml(value)); }
function setSemanticText(component: Component, role: string, value: string) { const holder = component.find(`[data-movecues-checklist-role="${role}"]`)[0]; if (!holder) return; const text = descendants(holder).find(node => node.is?.("textnode") || node.get("type") === "textnode"); if (text) text.set("content", value); else holder.append(escapeHtml(value)); }
function descendants(component: Component): Component[] { const values: Component[] = []; component.components()?.forEach?.((child: Component) => values.push(child, ...descendants(child))); return values; }
function cssEscape(value: string) { return value.replace(/["\\]/g, "\\$&"); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]!)); }

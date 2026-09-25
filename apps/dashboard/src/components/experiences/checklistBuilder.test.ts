import { describe, expect, it } from "vitest";
import { createChecklistItem, syncChecklistBuilder } from "./checklistBuilder";
import type { ChecklistExperienceDefinition } from "../../types/experiences";

describe("Checklist builder projection", () => {
  it("keeps customized item subtrees and CSS while updating structured copy and order", () => {
    const first = createChecklistItem(), second = createChecklistItem(); first.title = "First"; second.title = "Second";
    const definition = { title: "Checklist", description: "Description", items: [first, second], completionMessage: { title: "Done", description: "Complete", acknowledgeLabel: "Close" } } as ChecklistExperienceDefinition;
    const builder = { version: 1 as const, projectData: { diagnostic: true }, css: ".movecues-widget .custom{color:red}", html: `<section class="movecues-widget" data-movecues-checklist-role="root"><h2 data-movecues-checklist-role="title"></h2><p data-movecues-checklist-role="description"></p><div data-movecues-checklist-role="items"><button class="custom" data-movecues-checklist-item-id="${first.id}"><span class="kept-wrapper"><span data-movecues-checklist-item-role="title">Old</span></span><span data-movecues-checklist-item-role="description"></span></button></div><span data-movecues-checklist-role="launcher-label"></span><span data-movecues-checklist-role="completion-title"></span><span data-movecues-checklist-role="completion-description"></span><button data-movecues-checklist-role="completion-acknowledge"></button></section>` };
    const projected = syncChecklistBuilder(builder, { ...definition, items: [second, { ...first, title: "Updated" }] });
    expect(projected.css).toBe(builder.css); expect(projected.projectData).toBe(builder.projectData); expect(projected.html.indexOf(second.id)).toBeLessThan(projected.html.indexOf(first.id)); expect(projected.html).toContain('class="custom"'); expect(projected.html).toContain('class="kept-wrapper"'); expect(projected.html).toContain("Updated");
  });
});

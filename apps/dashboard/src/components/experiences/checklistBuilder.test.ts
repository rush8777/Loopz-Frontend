import { describe, expect, it } from "vitest";
import { createChecklistItem, syncChecklistBuilder } from "./checklistBuilder";
import type { ChecklistExperienceDefinition } from "../../types/experiences";

describe("Checklist builder projection", () => {
  it("keeps customized item subtrees and CSS while updating structured copy and order", () => {
    const first = createChecklistItem(), second = createChecklistItem(); first.title = "First"; second.title = "Second";
    const definition = { title: "Checklist", description: "Description", items: [first, second], completionMessage: { title: "Done", description: "Complete", acknowledgeLabel: "Close" } } as ChecklistExperienceDefinition;
    const builder = { version: 1 as const, projectData: { diagnostic: true }, css: ".movcues-widget .custom{color:red}", html: `<section class="movcues-widget" data-movcues-checklist-role="root"><h2 data-movcues-checklist-role="title"></h2><p data-movcues-checklist-role="description"></p><div data-movcues-checklist-role="items"><button class="custom" data-movcues-checklist-item-id="${first.id}"><span class="kept-wrapper"><span data-movcues-checklist-item-role="title">Old</span></span><span data-movcues-checklist-item-role="description"></span></button></div><span data-movcues-checklist-role="launcher-label"></span><span data-movcues-checklist-role="completion-title"></span><span data-movcues-checklist-role="completion-description"></span><button data-movcues-checklist-role="completion-acknowledge"></button></section>` };
    const projected = syncChecklistBuilder(builder, { ...definition, items: [second, { ...first, title: "Updated" }] });
    expect(projected.css).toBe(builder.css); expect(projected.projectData).toBe(builder.projectData); expect(projected.html.indexOf(second.id)).toBeLessThan(projected.html.indexOf(first.id)); expect(projected.html).toContain('class="custom"'); expect(projected.html).toContain('class="kept-wrapper"'); expect(projected.html).toContain("Updated");
  });
});

import { describe, expect, it } from "vitest";
import type { ExperienceContent, ExperienceDesign, WidgetType } from "../../types/experiences";
import { createWidgetStarter, isSafeBuilderProjectData, projectLegacyContent, sanitizeBuilderHtml, validateBuilderCss } from "./widgetBuilder";

const content: ExperienceContent = { heading: "Welcome", body: "Try this feature", primaryAction: { label: "Continue", type: "track_event", eventName: "continued" }, secondaryAction: { label: "Later", type: "dismiss" } };
const design: ExperienceDesign = { width: "md", theme: { background: "#ffffff", foreground: "#111827", primary: "#2563eb", borderRadius: "md" } };

describe("widget builder compatibility", () => {
  it("creates safe, scoped starters for every widget type", () => {
    const examples: Record<WidgetType, string> = { anchored_card: "Quick tip", toast: "Success", cursor_follow: "Tip", modal: "New feature", slideout: "What's new", hotspot: "Feature spotlight", banner: "Announcement" };
    for (const type of ["anchored_card", "toast", "cursor_follow", "modal", "slideout", "hotspot", "banner"] satisfies WidgetType[]) {
      const starter = createWidgetStarter(type, content, design);
      expect(starter.html).toContain(`data-loopz-widget-type="${type}"`); expect(starter.html).toContain(examples[type]); expect(starter.html).toContain("loopz-widget"); expect(validateBuilderCss(starter.css)).toBe(starter.css);
    }
    const modal = createWidgetStarter("modal", content, design), slideout = createWidgetStarter("slideout", content, design), banner = createWidgetStarter("banner", content, design); expect(modal.css).toContain("width:600px"); expect(slideout.css).toContain("width:400px"); expect(slideout.css).toContain("min-height:460px"); expect(banner.css).toContain("width:100%");
  });

  it("removes executable markup and unsafe attributes while preserving Loopz action ids", () => {
    const result = sanitizeBuilderHtml('<section class="loopz-widget"><script>alert(1)</script><button data-loopz-action-id="primary" onclick="alert(1)">Go</button><button data-loopz-action-id="primary">Duplicate</button><iframe src="https://evil.test"></iframe></section>');
    expect(result).not.toMatch(/script|iframe|onclick|Duplicate/i); expect(result).toContain('data-loopz-action-id="primary"');
  });

  it("rejects executable or unscoped CSS", () => {
    expect(() => validateBuilderCss("button{color:red}")).toThrow(/scoped/i); expect(() => validateBuilderCss("@import url('https://evil.test/x.css')")).toThrow(/not allowed/i); expect(validateBuilderCss(".loopz-widget .button{color:red}")).toContain(".loopz-widget");
  });

  it("rejects executable GrapesJS project state before it can be reopened", () => {
    expect(isSafeBuilderProjectData({ pages: [{ component: { script: "alert(1)" } }] })).toBe(false); expect(isSafeBuilderProjectData({ pages: [{ component: { attributes: { onpointerdown: "alert(1)" } } }] })).toBe(false); expect(isSafeBuilderProjectData({ pages: [{ component: { type: "text", content: "Safe" } }] })).toBe(true);
  });

  it("projects canonical builder content back into the legacy runtime model", () => {
    const html = '<section class="loopz-widget"><h2 data-loopz-content="heading">Updated</h2><p data-loopz-content="body">New body</p><button data-loopz-action-id="primary">Launch</button></section>';
    expect(projectLegacyContent(html, content)).toEqual({ heading: "Updated", body: "New body", primaryAction: { label: "Launch", type: "track_event", eventName: "continued" }, secondaryAction: undefined });
  });
});

import { describe, expect, it } from "vitest";
import type { ExperienceContent, ExperienceDesign, WidgetType } from "../../types/experiences";
import { createWidgetStarter, isSafeBuilderProjectData, projectLegacyContent, sanitizeBuilderHtml, validateBuilderCss } from "./widgetBuilder";

const content: ExperienceContent = { heading: "Welcome", body: "Try this feature", primaryAction: { label: "Continue", type: "track_event", eventName: "continued" }, secondaryAction: { label: "Later", type: "dismiss" } };
const design: ExperienceDesign = { width: "md", theme: { background: "#ffffff", foreground: "#111827", primary: "#2563eb", borderRadius: "md" } };

describe("widget builder compatibility", () => {
  it("creates safe, scoped starters for every widget type", () => {
    const examples: Record<WidgetType, string> = { anchored_card: "Quick tip", toast: "Success", cursor_follow: "Tip", modal: "New feature", slideout: "What's new", hotspot: "Feature spotlight", banner: "Announcement", survey: "feedback" };
    for (const type of ["anchored_card", "toast", "cursor_follow", "modal", "slideout", "hotspot", "banner", "survey"] satisfies WidgetType[]) {
      const starter = createWidgetStarter(type, content, design);
      expect(starter.html).toContain(`data-movcues-widget-type="${type}"`); expect(starter.html).toContain(examples[type]); expect(starter.html).toContain("movcues-widget"); expect(validateBuilderCss(starter.css)).toBe(starter.css);
    }
    const modal = createWidgetStarter("modal", content, design), slideout = createWidgetStarter("slideout", content, design), banner = createWidgetStarter("banner", content, design); expect(modal.css).toContain("display:flex;flex-direction:column"); expect(modal.css).toContain("width:600px"); expect(slideout.css).toContain("width:400px"); expect(slideout.css).toContain("min-height:460px"); expect(banner.css).toContain("display:flex;flex-direction:row"); expect(banner.css).toContain("width:100%");
    expect(modal.css).toContain("@media(max-width:600px)"); expect(modal.css).toContain(".movcues-widget--modal,.movcues-widget--survey{padding:24px 20px}"); expect(modal.css).toContain(".movcues-widget__actions{flex-wrap:wrap}");
    expect(banner.css).toContain(".movcues-widget--banner .movcues-widget__actions{width:100%;margin:0}"); expect(slideout.css).toContain(".movcues-widget--slideout{min-height:0;padding:24px 20px}");
    const survey = createWidgetStarter("survey", content, design); expect(survey.html).toContain("movcues-survey-validation"); expect(survey.html).not.toContain("data-movcues-survey-controls"); expect(survey.html).not.toContain("data-movcues-survey-action"); expect(survey.html).not.toMatch(/>Back<|>Next<|>Submit</);
  });

  it("removes executable markup and unsafe attributes while preserving movcues action ids", () => {
    const result = sanitizeBuilderHtml('<section class="movcues-widget"><script>alert(1)</script><button data-movcues-action-id="primary" onclick="alert(1)">Go</button><button data-movcues-action-id="primary">Duplicate</button><iframe src="javascript:alert(1)"></iframe></section>');
    expect(result).not.toMatch(/script|onclick|Duplicate|javascript:|iframe/i); expect(result).toContain('data-movcues-action-id="primary"');
  });

  it("preserves supported image and structural markup while removing unsupported media", () => {
    const html = '<section class="movcues-widget"><div class="movcues-widget__video"><video controls playsinline muted loop src="https://cdn.test/demo.mp4"><source src="/fallback.mp4"></video></div><div class="movcues-widget__avatar"><img src="https://cdn.test/avatar.png" alt="Profile"></div><ul class="movcues-widget__list"><li>Edited item</li></ul><iframe src="https://example.test/embed" title="Example" loading="lazy"></iframe><div class="movcues-widget__progress" aria-label="Progress"><span></span></div><button class="movcues-widget__close" type="button" aria-label="Close">×</button></section>';
    const result = sanitizeBuilderHtml(html);
    expect(result).not.toMatch(/<(?:video|iframe)\b/i); expect(result).toContain('<ul class="movcues-widget__list"><li>Edited item</li></ul>'); expect(result).toContain('src="https://cdn.test/avatar.png"'); expect(result).toContain('aria-label="Close"');
    const unsafe = sanitizeBuilderHtml('<section class="movcues-widget"><img src="data:image/svg+xml;base64,unsafe"><img src="data:image/png;base64,safe"></section>');
    expect(unsafe).not.toContain("svg+xml"); expect(unsafe).toContain("data:image/png;base64,safe");
  });

  it("preserves independently authored and duplicated survey button actions", () => {
    const result = sanitizeBuilderHtml('<section class="movcues-widget"><button class="movcues-widget__button" data-movcues-survey-action="next">Continue</button><button class="movcues-widget__button--secondary" data-movcues-survey-action="next">Alternate</button><button data-movcues-survey-action="back">Previous</button></section>', true);
    expect(result.match(/data-movcues-survey-action="next"/g)).toHaveLength(2); expect(result).toContain('data-movcues-survey-action="back"');
  });

  it("round-trips custom survey HTML and CSS through save and reload sanitization", () => {
    const html = '<section class="movcues-widget custom-survey"><div class="movcues-survey-question custom-question movcues-style--saved" data-movcues-question-id="question_1" data-movcues-question-type="short_text"><div class="custom-wrapper"><p class="movcues-survey-question__label">Name</p><input type="text" class="custom-input" data-movcues-question-input placeholder="Your name"></div></div></section>';
    const css = ".movcues-widget.custom-survey{background:#fff}.movcues-widget .movcues-style--saved{padding:12px}";
    const savedHtml = sanitizeBuilderHtml(html, true); const savedCss = validateBuilderCss(css);
    expect(sanitizeBuilderHtml(savedHtml, true)).toBe(savedHtml); expect(validateBuilderCss(savedCss)).toBe(savedCss);
    expect(savedHtml).toContain("custom-wrapper"); expect(savedHtml).toContain("movcues-style--saved"); expect(savedHtml).toContain("custom-input");
  });

  it("preserves Free Area and stable item marker classes", () => {
    const result = sanitizeBuilderHtml('<section class="movcues-widget"><div class="movcues-free-area movcues-free-area--stable"><p class="movcues-free-item movcues-free-item--stable-1">Free text</p></div></section>');
    expect(result).toContain("movcues-free-area--stable"); expect(result).toContain("movcues-free-item--stable-1"); expect(validateBuilderCss(".movcues-widget .movcues-free-item--stable-1{position:absolute;left:12px;top:20px}")).toContain("movcues-free-item--stable-1");
  });

  it("preserves safe line breaks created by rich-text editing", () => {
    const result = sanitizeBuilderHtml('<section class="movcues-widget"><p>First line<br>Second line<br/>Third line</p></section>');
    expect(result).toContain("First line<br>Second line<br>Third line");
  });

  it("rejects executable or unscoped CSS", () => {
    expect(() => validateBuilderCss("button{color:red}")).toThrow(/scoped/i); expect(() => validateBuilderCss("@import url('https://evil.test/x.css')")).toThrow(/not allowed/i); expect(validateBuilderCss(".movcues-widget .button{color:red}")).toContain(".movcues-widget");
    expect(validateBuilderCss("@media(max-width:600px){.movcues-widget .button{width:100%}}")).toContain("@media");
    expect(() => validateBuilderCss("@media(max-width:600px){button{width:100%}}")).toThrow(/scoped/i);
  });

  it("rejects executable GrapesJS project state before it can be reopened", () => {
    expect(isSafeBuilderProjectData({ pages: [{ component: { script: "alert(1)" } }] })).toBe(false); expect(isSafeBuilderProjectData({ pages: [{ component: { attributes: { onpointerdown: "alert(1)" } } }] })).toBe(false); expect(isSafeBuilderProjectData({ pages: [{ component: { type: "text", content: "Safe" } }] })).toBe(true);
  });

  it("projects canonical builder content back into the legacy runtime model", () => {
    const html = '<section class="movcues-widget"><h2 data-movcues-content="heading">Updated</h2><p data-movcues-content="body">New body</p><button data-movcues-action-id="primary">Launch</button></section>';
    expect(projectLegacyContent(html, content)).toEqual({ heading: "Updated", body: "New body", primaryAction: { label: "Launch", type: "track_event", eventName: "continued" }, secondaryAction: undefined });
  });
});

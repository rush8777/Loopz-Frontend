import type { ExperienceContent, ExperienceDesign, SurveyQuestion, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { widgetSizeCss } from "./widgetSizing";
import { BUILDER_ALLOWED_ATTRIBUTES, BUILDER_ALLOWED_TAGS, BUILDER_BLOCKED_TAGS, BUILDER_SURVEY_INPUT_TAGS, builderImageUrlIsSafe, builderInputTypeIsSafe, validateScopedBuilderCss } from "./builderContentContract";

const ROOT_CLASS = "movcues-widget";

export interface BuilderExport {
  builder: WidgetBuilderState;
  content: ExperienceContent;
}

export function createWidgetStarter(widgetType: WidgetType, content: ExperienceContent, design: ExperienceDesign): { html: string; css: string } {
  const heading = `<h2 class="movcues-widget__heading" data-movcues-content="heading">${escapeHtml(content.heading)}</h2>`;
  const body = `<p class="movcues-widget__body" data-movcues-content="body">${escapeHtml(content.body)}</p>`;
  const actions = actionMarkup(content);
  const typeContent: Record<WidgetType, string> = {
    anchored_card: `<span class="movcues-widget__eyebrow">Quick tip</span>${heading}${body}${actions}`,
    toast: `<div class="movcues-widget__icon" role="img" aria-label="Success">✓</div><div class="movcues-widget__message">${heading}${body}</div>${actions}`,
    cursor_follow: `<div class="movcues-widget__icon" role="img" aria-label="Tip">✦</div><div class="movcues-widget__message">${heading}${body}</div>${actions}`,
    modal: `<span class="movcues-widget__eyebrow">New feature</span>${heading}${body}<hr class="movcues-widget__divider">${actions}`,
    slideout: `<div class="movcues-widget__icon" role="img" aria-label="Announcement">✦</div><span class="movcues-widget__eyebrow">What's new</span>${heading}${body}<div class="movcues-widget__spacer"></div>${actions}`,
    hotspot: `<span class="movcues-widget__eyebrow">Feature spotlight</span>${heading}${body}${actions}`,
    banner: `<div class="movcues-widget__icon" role="img" aria-label="Announcement">★</div><div class="movcues-widget__message">${heading}${body}</div>${actions}`,
    // Survey navigation is authored with the regular Button blocks.  In
    // particular, do not add a footer here: saved HTML is the contract the
    // runtime receives and it must never imply controls the author did not add.
    survey: `<span class="movcues-widget__eyebrow">We'd love your feedback</span>${heading}${body}<div class="movcues-survey-validation" role="status" aria-live="polite"></div>`,
  };
  const size = widgetSizeCss(widgetType, design);
  const radius = design.theme.borderRadius === "sm" ? "6px" : design.theme.borderRadius === "lg" ? "20px" : "12px";
  const direction = widgetType === "toast" || widgetType === "cursor_follow" || widgetType === "banner" ? "row" : "column";
  const html = `<section class="${ROOT_CLASS} ${ROOT_CLASS}--${widgetType}" data-movcues-widget-type="${widgetType}">${typeContent[widgetType]}</section>`;
  const css = `.movcues-widget{box-sizing:border-box;display:flex;flex-direction:${direction};width:${size.width};${size.minWidth ? `min-width:${size.minWidth};` : ""}${size.maxWidth ? `max-width:${size.maxWidth};` : ""}height:${size.height};max-height:${size.maxHeight};overflow:auto;padding:22px;background:${design.theme.background};color:${design.theme.foreground};border:1px solid rgba(15,23,42,.10);border-radius:${radius};font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 18px 48px rgba(15,23,42,.18)}
.movcues-widget__eyebrow{display:inline-block;margin-bottom:10px;color:${design.theme.primary};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.movcues-widget__heading{margin:0 0 8px;font-size:21px;line-height:1.25}.movcues-widget__body{margin:0;color:inherit;font-size:14px;line-height:1.55;opacity:.82}.movcues-widget__message{min-width:0}.movcues-widget__icon{display:grid;flex:0 0 auto;width:38px;height:38px;place-items:center;border-radius:12px;background:${design.theme.primary};color:#fff;font-size:18px;font-weight:800}.movcues-widget__divider{height:1px;margin:20px 0;border:0;background:rgba(15,23,42,.12)}.movcues-widget__spacer{min-height:72px}.movcues-widget__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.movcues-widget__button{border:0;border-radius:8px;padding:10px 16px;background:${design.theme.primary};color:#fff;font-weight:700;cursor:pointer}.movcues-widget__button--secondary{background:transparent;color:inherit}
.movcues-widget--toast{display:flex;align-items:center;gap:14px;padding:16px 18px}.movcues-widget--toast .movcues-widget__heading{margin-bottom:3px;font-size:15px}.movcues-widget--toast .movcues-widget__body{font-size:13px}.movcues-widget--toast .movcues-widget__actions{margin:0 0 0 auto}
.movcues-widget--cursor_follow{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:999px}.movcues-widget--cursor_follow .movcues-widget__icon{width:32px;height:32px;border-radius:50%}.movcues-widget--cursor_follow .movcues-widget__heading{margin-bottom:2px;font-size:14px}.movcues-widget--cursor_follow .movcues-widget__body{font-size:12px}.movcues-widget--cursor_follow .movcues-widget__actions{margin:0 0 0 auto}
.movcues-widget--modal{padding:38px;text-align:center}.movcues-widget--modal .movcues-widget__heading{font-size:30px}.movcues-widget--modal .movcues-widget__body{max-width:440px;margin:0 auto}.movcues-widget--modal .movcues-widget__actions{justify-content:center}
.movcues-widget--slideout{min-height:460px;padding:30px}.movcues-widget--slideout .movcues-widget__icon{margin-bottom:28px}.movcues-widget--slideout .movcues-widget__heading{font-size:26px}
.movcues-widget--hotspot{padding:18px}.movcues-widget--hotspot .movcues-widget__heading{font-size:17px}.movcues-widget--hotspot .movcues-widget__body{font-size:13px}
.movcues-widget--banner{display:flex;align-items:center;gap:16px;padding:14px 22px;border-radius:0}.movcues-widget--banner .movcues-widget__icon{width:34px;height:34px}.movcues-widget--banner .movcues-widget__heading{margin-bottom:2px;font-size:15px}.movcues-widget--banner .movcues-widget__body{font-size:13px}.movcues-widget--banner .movcues-widget__actions{margin:0 0 0 auto}
.movcues-widget--survey{padding:36px}.movcues-widget--survey .movcues-widget__heading{font-size:28px}.movcues-widget--survey .movcues-survey-footer{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:24px}
@media(max-width:600px){.movcues-widget{gap:12px}.movcues-widget__heading{font-size:19px}.movcues-widget__actions{flex-wrap:wrap}.movcues-widget__button{min-height:44px}.movcues-widget--modal,.movcues-widget--survey{padding:24px 20px}.movcues-widget--modal .movcues-widget__heading,.movcues-widget--survey .movcues-widget__heading{font-size:24px}.movcues-widget--slideout{min-height:0;padding:24px 20px}.movcues-widget--slideout .movcues-widget__icon{margin-bottom:12px}.movcues-widget--slideout .movcues-widget__heading{font-size:22px}.movcues-widget--toast{align-items:flex-start}.movcues-widget--toast .movcues-widget__actions{width:100%;margin:4px 0 0}.movcues-widget--banner{flex-wrap:wrap;align-items:flex-start;padding:14px max(16px,env(safe-area-inset-right,0px)) 14px max(16px,env(safe-area-inset-left,0px))}.movcues-widget--banner .movcues-widget__icon{display:none}.movcues-widget--banner .movcues-widget__message{flex:1 1 100%}.movcues-widget--banner .movcues-widget__actions{width:100%;margin:0}.movcues-widget--banner .movcues-widget__button{flex:1 1 140px}.movcues-widget--survey .movcues-survey-options{display:flex;flex-wrap:wrap;gap:8px}.movcues-widget--survey .movcues-survey-footer{flex-wrap:wrap;gap:8px}.movcues-widget--survey .movcues-survey-footer .movcues-widget__button{flex:1 1 120px}}`;
  return { html, css };
}

export function sanitizeBuilderHtml(input: string, allowSurveyInputs = false): string {
  const documentValue = new DOMParser().parseFromString(input, "text/html");
  for (const element of Array.from(documentValue.body.querySelectorAll("*"))) {
    if (!BUILDER_ALLOWED_TAGS.has(element.tagName) && !(allowSurveyInputs && BUILDER_SURVEY_INPUT_TAGS.has(element.tagName))) { if (BUILDER_BLOCKED_TAGS.test(element.tagName)) element.remove(); else element.replaceWith(...Array.from(element.childNodes)); continue; }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (!BUILDER_ALLOWED_ATTRIBUTES.has(name) || name.startsWith("on") || /javascript\s*:/i.test(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === "IMG") {
      const source = element.getAttribute("src") ?? "";
      if (!builderImageUrlIsSafe(source)) element.removeAttribute("src");
    }
    if (element.hasAttribute("src") && element.tagName !== "IMG") element.removeAttribute("src");
    const action = element.getAttribute("data-movcues-action-id");
    if (action && action !== "primary" && action !== "secondary") element.removeAttribute("data-movcues-action-id");
    const surveyAction = element.getAttribute("data-movcues-survey-action");
    if (surveyAction && surveyAction !== "back" && surveyAction !== "next" && surveyAction !== "submit") element.removeAttribute("data-movcues-survey-action");
    if (element.tagName === "INPUT" && !builderInputTypeIsSafe(element.getAttribute("type") ?? "text")) element.setAttribute("type", "text");
  }
  for (const slot of ["primary", "secondary"] as const) {
    const actions = Array.from(documentValue.body.querySelectorAll(`[data-movcues-action-id="${slot}"]`));
    actions.slice(1).forEach(action => action.remove());
  }
  const roots = Array.from(documentValue.body.children);
  if (roots.length !== 1 || !roots[0].classList.contains(ROOT_CLASS)) {
    const root = documentValue.createElement("section"); root.className = ROOT_CLASS; root.append(...Array.from(documentValue.body.childNodes)); documentValue.body.appendChild(root);
  }
  return documentValue.body.innerHTML;
}

export function surveyQuestionMarkup(question: SurveyQuestion): string {
  const label = `<p class="movcues-survey-question__label">${escapeHtml(question.label)}${question.required ? '<span class="movcues-survey-question__required" aria-hidden="true"> *</span>' : ""}</p>`;
  let control = "";
  if (question.type === "single_choice" || question.type === "multiple_choice") control = `<div class="movcues-survey-options" role="group" aria-label="${escapeHtml(question.label)}">${question.options.map(option => `<button type="button" class="movcues-survey-option" data-movcues-option-id="${escapeHtml(option.id)}" aria-pressed="false">${escapeHtml(option.label)}</button>`).join("")}</div>`;
  else if (question.type === "rating" || question.type === "nps") { const min = question.type === "rating" ? question.min : 0; const max = question.type === "rating" ? question.max : 10; control = `<div class="movcues-survey-options" role="group" aria-label="${escapeHtml(question.label)}">${Array.from({ length: max - min + 1 }, (_, index) => min + index).map(value => `<button type="button" class="movcues-survey-option" data-movcues-option-id="${value}" aria-pressed="false">${value}</button>`).join("")}</div>`; }
  else if (question.type === "long_text") control = `<textarea class="movcues-survey-input" data-movcues-question-input placeholder="${escapeHtml(question.placeholder ?? "")}"${question.maxLength ? ` maxlength="${question.maxLength}"` : ""} aria-label="${escapeHtml(question.label)}"></textarea>`;
  else control = `<input type="text" class="movcues-survey-input" data-movcues-question-input placeholder="${escapeHtml(question.placeholder ?? "")}"${question.maxLength ? ` maxlength="${question.maxLength}"` : ""} aria-label="${escapeHtml(question.label)}">`;
  return `<div class="movcues-survey-question movcues-survey-question--${question.type}" data-movcues-question-id="${escapeHtml(question.id)}" data-movcues-question-type="${question.type}">${label}${control}</div>`;
}

export function validateBuilderCss(input: string): string {
  return validateScopedBuilderCss(input);
}

export function projectLegacyContent(html: string, previous: ExperienceContent): ExperienceContent {
  const documentValue = new DOMParser().parseFromString(html, "text/html");
  const text = (selector: string, fallback: string) => documentValue.querySelector(selector)?.textContent?.trim() || fallback;
  const primary = documentValue.querySelector<HTMLElement>('[data-movcues-action-id="primary"]');
  const secondary = documentValue.querySelector<HTMLElement>('[data-movcues-action-id="secondary"]');
  return {
    heading: text('[data-movcues-content="heading"]', previous.heading),
    body: text('[data-movcues-content="body"]', previous.body),
    primaryAction: primary ? { ...(previous.primaryAction ?? { type: "dismiss" as const }), label: primary.textContent?.trim() || previous.primaryAction?.label || "Continue" } : undefined,
    secondaryAction: secondary ? { type: "dismiss", label: secondary.textContent?.trim() || previous.secondaryAction?.label || "Dismiss" } : undefined,
  };
}

// The SDK renders HTML/CSS, so those two fields are the persistence identity.
// GrapesJS regenerates internal component/page IDs when parsing HTML; including
// projectData here would make an unchanged reload look like a user edit.
export function builderSignature(builder: WidgetBuilderState): string {
  return JSON.stringify({ version: builder.version, html: builder.html, css: builder.css, canvas: builder.canvas });
}

export function isSafeBuilderProjectData(projectData: Record<string, unknown>): boolean {
  return projectValueIsSafe(projectData);
}

function projectValueIsSafe(value: unknown): boolean {
  if (typeof value === "string") return !/<\s*script\b|\son[a-z]+\s*=|javascript\s*:/i.test(value);
  if (Array.isArray(value)) return value.every(projectValueIsSafe);
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(([key, nested]) => !/^on[a-z]+$/i.test(key) && !/^script(?:-|$)/i.test(key) && projectValueIsSafe(nested));
}

function actionMarkup(content: ExperienceContent): string {
  const primary = content.primaryAction ? `<button class="movcues-widget__button" data-movcues-action-id="primary">${escapeHtml(content.primaryAction.label)}</button>` : "";
  const secondary = content.secondaryAction ? `<button class="movcues-widget__button movcues-widget__button--secondary" data-movcues-action-id="secondary">${escapeHtml(content.secondaryAction.label)}</button>` : "";
  return primary || secondary ? `<div class="movcues-widget__actions">${secondary}${primary}</div>` : "";
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!); }

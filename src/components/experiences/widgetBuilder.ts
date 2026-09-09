import type { ExperienceContent, ExperienceDesign, WidgetBuilderState, WidgetType } from "../../types/experiences";
import { widgetSizeCss } from "./widgetSizing";

const ALLOWED_TAGS = new Set(["DIV", "SECTION", "H1", "H2", "H3", "H4", "P", "SPAN", "BUTTON", "IMG", "HR"]);
const ALLOWED_ATTRIBUTES = new Set(["class", "id", "title", "role", "aria-label", "alt", "src", "width", "height", "data-movecues-action-id", "data-movecues-content", "data-movecues-widget-type"]);
const ROOT_CLASS = "movecues-widget";

export interface BuilderExport {
  builder: WidgetBuilderState;
  content: ExperienceContent;
}

export function createWidgetStarter(widgetType: WidgetType, content: ExperienceContent, design: ExperienceDesign): { html: string; css: string } {
  const heading = `<h2 class="movecues-widget__heading" data-movecues-content="heading">${escapeHtml(content.heading)}</h2>`;
  const body = `<p class="movecues-widget__body" data-movecues-content="body">${escapeHtml(content.body)}</p>`;
  const actions = actionMarkup(content);
  const typeContent: Record<WidgetType, string> = {
    anchored_card: `<span class="movecues-widget__eyebrow">Quick tip</span>${heading}${body}${actions}`,
    toast: `<div class="movecues-widget__icon" role="img" aria-label="Success">✓</div><div class="movecues-widget__message">${heading}${body}</div>${actions}`,
    cursor_follow: `<div class="movecues-widget__icon" role="img" aria-label="Tip">✦</div><div class="movecues-widget__message">${heading}${body}</div>${actions}`,
    modal: `<span class="movecues-widget__eyebrow">New feature</span>${heading}${body}<hr class="movecues-widget__divider">${actions}`,
    slideout: `<div class="movecues-widget__icon" role="img" aria-label="Announcement">✦</div><span class="movecues-widget__eyebrow">What's new</span>${heading}${body}<div class="movecues-widget__spacer"></div>${actions}`,
    hotspot: `<span class="movecues-widget__eyebrow">Feature spotlight</span>${heading}${body}${actions}`,
    banner: `<div class="movecues-widget__icon" role="img" aria-label="Announcement">★</div><div class="movecues-widget__message">${heading}${body}</div>${actions}`,
  };
  const size = widgetSizeCss(widgetType, design);
  const radius = design.theme.borderRadius === "sm" ? "6px" : design.theme.borderRadius === "lg" ? "20px" : "12px";
  const html = `<section class="${ROOT_CLASS} ${ROOT_CLASS}--${widgetType}" data-movecues-widget-type="${widgetType}">${typeContent[widgetType]}</section>`;
  const css = `.movecues-widget{box-sizing:border-box;width:${size.width};${size.minWidth ? `min-width:${size.minWidth};` : ""}${size.maxWidth ? `max-width:${size.maxWidth};` : ""}height:${size.height};max-height:${size.maxHeight};overflow:auto;padding:22px;background:${design.theme.background};color:${design.theme.foreground};border:1px solid rgba(15,23,42,.10);border-radius:${radius};font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 18px 48px rgba(15,23,42,.18)}
.movecues-widget__eyebrow{display:inline-block;margin-bottom:10px;color:${design.theme.primary};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.movecues-widget__heading{margin:0 0 8px;font-size:21px;line-height:1.25}.movecues-widget__body{margin:0;color:inherit;font-size:14px;line-height:1.55;opacity:.82}.movecues-widget__message{min-width:0}.movecues-widget__icon{display:grid;flex:0 0 auto;width:38px;height:38px;place-items:center;border-radius:12px;background:${design.theme.primary};color:#fff;font-size:18px;font-weight:800}.movecues-widget__divider{height:1px;margin:20px 0;border:0;background:rgba(15,23,42,.12)}.movecues-widget__spacer{min-height:72px}.movecues-widget__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.movecues-widget__button{border:0;border-radius:8px;padding:10px 16px;background:${design.theme.primary};color:#fff;font-weight:700;cursor:pointer}.movecues-widget__button--secondary{background:transparent;color:inherit}
.movecues-widget--toast{display:flex;align-items:center;gap:14px;padding:16px 18px}.movecues-widget--toast .movecues-widget__heading{margin-bottom:3px;font-size:15px}.movecues-widget--toast .movecues-widget__body{font-size:13px}.movecues-widget--toast .movecues-widget__actions{margin:0 0 0 auto}
.movecues-widget--cursor_follow{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:999px}.movecues-widget--cursor_follow .movecues-widget__icon{width:32px;height:32px;border-radius:50%}.movecues-widget--cursor_follow .movecues-widget__heading{margin-bottom:2px;font-size:14px}.movecues-widget--cursor_follow .movecues-widget__body{font-size:12px}.movecues-widget--cursor_follow .movecues-widget__actions{margin:0 0 0 auto}
.movecues-widget--modal{padding:38px;text-align:center}.movecues-widget--modal .movecues-widget__heading{font-size:30px}.movecues-widget--modal .movecues-widget__body{max-width:440px;margin:0 auto}.movecues-widget--modal .movecues-widget__actions{justify-content:center}
.movecues-widget--slideout{min-height:460px;padding:30px}.movecues-widget--slideout .movecues-widget__icon{margin-bottom:28px}.movecues-widget--slideout .movecues-widget__heading{font-size:26px}
.movecues-widget--hotspot{padding:18px}.movecues-widget--hotspot .movecues-widget__heading{font-size:17px}.movecues-widget--hotspot .movecues-widget__body{font-size:13px}
.movecues-widget--banner{display:flex;align-items:center;gap:16px;padding:14px 22px;border-radius:0}.movecues-widget--banner .movecues-widget__icon{width:34px;height:34px}.movecues-widget--banner .movecues-widget__heading{margin-bottom:2px;font-size:15px}.movecues-widget--banner .movecues-widget__body{font-size:13px}.movecues-widget--banner .movecues-widget__actions{margin:0 0 0 auto}
@media(max-width:600px){.movecues-widget--modal{padding:26px}.movecues-widget--banner{align-items:flex-start}.movecues-widget--banner .movecues-widget__icon{display:none}}`;
  return { html, css };
}

export function sanitizeBuilderHtml(input: string): string {
  const documentValue = new DOMParser().parseFromString(input, "text/html");
  for (const element of Array.from(documentValue.body.querySelectorAll("*"))) {
    if (!ALLOWED_TAGS.has(element.tagName)) { element.replaceWith(...Array.from(element.childNodes)); continue; }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (!ALLOWED_ATTRIBUTES.has(name) || name.startsWith("on") || /javascript\s*:/i.test(attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === "IMG") {
      const source = element.getAttribute("src") ?? "";
      if (source && !/^(https?:|data:image\/(?:png|gif|jpeg|webp|svg\+xml);base64,|\/)/i.test(source)) element.removeAttribute("src");
    }
  }
  for (const slot of ["primary", "secondary"] as const) {
    const actions = Array.from(documentValue.body.querySelectorAll(`[data-movecues-action-id="${slot}"]`));
    actions.slice(1).forEach(action => action.remove());
  }
  const roots = Array.from(documentValue.body.children);
  if (roots.length !== 1 || !roots[0].classList.contains(ROOT_CLASS)) {
    const root = documentValue.createElement("section"); root.className = ROOT_CLASS; root.append(...Array.from(documentValue.body.childNodes)); documentValue.body.appendChild(root);
  }
  return documentValue.body.innerHTML;
}

export function validateBuilderCss(input: string): string {
  const css = input.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (/@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(css)) throw new Error("CSS imports and executable CSS are not allowed.");
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith("@")) continue;
    for (const selector of prelude.split(",")) if (!selector.trim().includes(`.${ROOT_CLASS}`)) throw new Error("Every CSS selector must be scoped under .movecues-widget.");
  }
  return css;
}

/** Scope class/id rules generated by GrapesJS before export. Code-mode input
 * remains strictly validated before it ever reaches the editor. */
export function scopeEditorGeneratedCss(input: string): string {
  return input.replace(/([^{}]+)\{/g, (match, prelude: string) => {
    const value = prelude.trim();
    if (!value || value.startsWith("@")) return match;
    const selectors = value.split(",").map(selector => {
      const trimmed = selector.trim();
      if (trimmed.includes(`.${ROOT_CLASS}`)) return trimmed;
      return trimmed === ":root" ? `.${ROOT_CLASS}` : `.${ROOT_CLASS} ${trimmed}`;
    });
    return `${selectors.join(",")}{`;
  });
}

export function projectLegacyContent(html: string, previous: ExperienceContent): ExperienceContent {
  const documentValue = new DOMParser().parseFromString(html, "text/html");
  const text = (selector: string, fallback: string) => documentValue.querySelector(selector)?.textContent?.trim() || fallback;
  const primary = documentValue.querySelector<HTMLElement>('[data-movecues-action-id="primary"]');
  const secondary = documentValue.querySelector<HTMLElement>('[data-movecues-action-id="secondary"]');
  return {
    heading: text('[data-movecues-content="heading"]', previous.heading),
    body: text('[data-movecues-content="body"]', previous.body),
    primaryAction: primary ? { ...(previous.primaryAction ?? { type: "dismiss" as const }), label: primary.textContent?.trim() || previous.primaryAction?.label || "Continue" } : undefined,
    secondaryAction: secondary ? { type: "dismiss", label: secondary.textContent?.trim() || previous.secondaryAction?.label || "Dismiss" } : undefined,
  };
}

export function builderSignature(builder: WidgetBuilderState): string { return JSON.stringify(builder); }

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
  const primary = content.primaryAction ? `<button class="movecues-widget__button" data-movecues-action-id="primary">${escapeHtml(content.primaryAction.label)}</button>` : "";
  const secondary = content.secondaryAction ? `<button class="movecues-widget__button movecues-widget__button--secondary" data-movecues-action-id="secondary">${escapeHtml(content.secondaryAction.label)}</button>` : "";
  return primary || secondary ? `<div class="movecues-widget__actions">${secondary}${primary}</div>` : "";
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!); }

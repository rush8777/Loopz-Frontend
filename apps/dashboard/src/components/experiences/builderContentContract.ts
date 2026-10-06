/** Security contract mirrored by the backend authority and SDK runtime. */
export const BUILDER_ALLOWED_TAGS = new Set(["DIV", "SECTION", "HEADER", "H1", "H2", "H3", "H4", "P", "SPAN", "BR", "BUTTON", "IMG", "HR", "LABEL", "UL", "LI"]);
export const BUILDER_SURVEY_INPUT_TAGS = new Set(["INPUT", "TEXTAREA"]);
export const BUILDER_ALLOWED_ATTRIBUTES = new Set(["class", "id", "title", "role", "aria-label", "aria-live", "aria-hidden", "aria-pressed", "alt", "src", "width", "height", "type", "placeholder", "maxlength", "data-movcues-action-id", "data-movcues-content", "data-movcues-widget-type", "data-movcues-question-id", "data-movcues-question-type", "data-movcues-question-input", "data-movcues-option-id", "data-movcues-survey-action", "data-movcues-survey-controls", "data-movcues-survey-progress", "data-movcues-survey-progress-bar", "data-movcues-survey-step-id", "data-movcues-checklist-role", "data-movcues-checklist-item-id", "data-movcues-checklist-item-role", "data-movcues-checklist-view"]);
export const BUILDER_BLOCKED_TAGS = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|FORM|INPUT|TEXTAREA|SELECT|VIDEO|AUDIO|SOURCE)$/i;
export const BUILDER_UNSAFE_CSS = /@import|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i;

export function builderImageUrlIsSafe(value: string): boolean { return !value || /^(https?:|data:image\/(?:png|gif|jpeg|webp);base64,|\/)/i.test(value); }
export function builderInputTypeIsSafe(value: string): boolean { return ["text", "radio", "checkbox", "number"].includes(value.toLowerCase()); }

export function validateScopedBuilderCss(input: string): string {
  const css = input.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (BUILDER_UNSAFE_CSS.test(css)) throw new Error("CSS imports and executable CSS are not allowed.");
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    const prelude = match[1].trim();
    if (!prelude || prelude.startsWith("@")) continue;
    for (const selector of prelude.split(",")) if (!selector.trim().includes(".movcues-widget")) throw new Error("Every CSS selector must be scoped under .movcues-widget.");
  }
  return css;
}

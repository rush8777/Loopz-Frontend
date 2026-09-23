/** Security contract mirrored by the backend authority and SDK runtime. */
export const BUILDER_ALLOWED_TAGS = new Set(["DIV", "SECTION", "H1", "H2", "H3", "H4", "P", "SPAN", "BR", "BUTTON", "IMG", "HR", "LABEL", "UL", "LI"]);
export const BUILDER_SURVEY_INPUT_TAGS = new Set(["INPUT", "TEXTAREA"]);
export const BUILDER_ALLOWED_ATTRIBUTES = new Set(["class", "id", "title", "role", "aria-label", "aria-live", "aria-hidden", "aria-pressed", "alt", "src", "width", "height", "type", "placeholder", "maxlength", "data-movecues-action-id", "data-movecues-content", "data-movecues-widget-type", "data-movecues-question-id", "data-movecues-question-type", "data-movecues-question-input", "data-movecues-option-id", "data-movecues-survey-action", "data-movecues-survey-controls", "data-movecues-survey-progress", "data-movecues-survey-progress-bar", "data-movecues-survey-step-id"]);
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
    for (const selector of prelude.split(",")) if (!selector.trim().includes(".movecues-widget")) throw new Error("Every CSS selector must be scoped under .movecues-widget.");
  }
  return css;
}

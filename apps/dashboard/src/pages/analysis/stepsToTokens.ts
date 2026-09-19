import type { PatternStep } from "../../types/api";

/**
 * Converts pattern-builder steps into the action-token strings real
 * sessions are tokenized into on the backend (see analysis/features.ts's
 * tokenFor()) - this is what makes "test this pattern against real
 * sessions" (the fuzzy similar-sessions call) usable directly from the
 * builder, without a second, separate token-entry UI.
 *
 * Approximate on purpose: session tokens are derived from what actually
 * happened (an event either occurred or didn't), not from a threshold -
 * a step's minDurationMs/minScrollPercent has no token-level
 * representation, since real session tokens don't carry duration. This
 * is a reasonable stand-in for fuzzy discovery, not a perfect one.
 */
export function stepsToTokens(steps: PatternStep[]): string[] {
  return steps.map((step) => {
    switch (step.verb) {
      case "enter":
        return "enter";
      case "hover":
        return step.target?.selector ? `hover:${step.target.selector}` : "hover";
      case "click":
        return step.target?.selector ? `click:${step.target.selector}` : "click";
      case "scroll_past":
        // Real scroll events carry no selector, so their token is the bare verb - see tokenFor() on the backend.
        return "scroll";
    }
  });
}

import { describe, expect, it } from "vitest";
import { ApiError } from "./client";

describe("ApiError", () => {
  it("surfaces backend validation paths and messages", () => {
    const error = new ApiError(400, { error: "invalid_definition", details: { issues: [{ path: ["survey", "steps", 0, "builder", "html"], message: "unsupported builder element" }] } });
    expect(error.message).toContain("invalid_definition"); expect(error.message).toContain("survey.steps.0.builder.html"); expect(error.message).toContain("unsupported builder element");
  });
});

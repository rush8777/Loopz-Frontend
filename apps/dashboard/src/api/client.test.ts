import { describe, expect, it } from "vitest";
import { ApiError, entitlementError } from "./client";

describe("ApiError", () => {
  it("surfaces backend validation paths and messages", () => {
    const error = new ApiError(400, { error: "invalid_definition", details: { issues: [{ path: ["survey", "steps", 0, "builder", "html"], message: "unsupported builder element" }] } });
    expect(error.message).toContain("invalid_definition"); expect(error.message).toContain("survey.steps.0.builder.html"); expect(error.message).toContain("unsupported builder element");
  });

  it("recognizes structured entitlement denials for the upgrade wall", () => {
    const error = new ApiError(403, { error: "resource_limit", entitlement: { resource: "site", current: 1, limit: 1, planId: "starter" } });
    expect(entitlementError(error)).toMatchObject({ error: "resource_limit", entitlement: { resource: "site", current: 1, limit: 1 } });
    expect(entitlementError(new Error("nope"))).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { resolveDateRange } from "../lib/dateRange";

describe("resolveDateRange", () => {
  it("resolves 'today' to a since at midnight and until now", () => {
    const range = resolveDateRange("today");
    expect(range).not.toBeNull();
    const since = new Date(range!.since);
    expect(since.getHours()).toBe(0);
    expect(since.getMinutes()).toBe(0);
  });

  it("resolves '7d' to a 7-day span", () => {
    const range = resolveDateRange("7d")!;
    const days = (new Date(range.until).getTime() - new Date(range.since).getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThanOrEqual(6.9);
    expect(days).toBeLessThanOrEqual(7.1);
  });

  it("resolves '30d' and '90d' to correspondingly wider spans", () => {
    const r30 = resolveDateRange("30d")!;
    const r90 = resolveDateRange("90d")!;
    const span = (r: { since: string; until: string }) => new Date(r.until).getTime() - new Date(r.since).getTime();
    expect(span(r90)).toBeGreaterThan(span(r30));
  });

  it("returns null for 'custom' when since/until are incomplete", () => {
    expect(resolveDateRange("custom")).toBeNull();
    expect(resolveDateRange("custom", "2026-01-01")).toBeNull();
  });

  it("resolves 'custom' with both bounds provided", () => {
    const range = resolveDateRange("custom", "2026-01-01", "2026-01-15");
    expect(range).not.toBeNull();
    expect(new Date(range!.since).toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(new Date(range!.until).toISOString().slice(0, 10)).toBe("2026-01-15");
  });
});

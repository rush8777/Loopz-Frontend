import { describe, expect, it } from "vitest";
import { findLargestDrop } from "./FunnelDetailPage";
import type { FunnelStepResult } from "../../types/api";

const step = (index: number, users: number, conversionFromPrevious: number, droppedBeforeNext: number): FunnelStepResult => ({ index, type: "event", label: `Step ${index + 1}`, users, conversionFromStart: index === 0 ? 100 : 0, conversionFromPrevious, droppedBeforeNext });

describe("findLargestDrop", () => {
  it("finds the largest meaningful transition drop", () => {
    const result = findLargestDrop([step(0, 1000, 100, 180), step(1, 820, 82, 320), step(2, 500, 61, 20), step(3, 480, 96, 0)]);
    expect(result).toMatchObject({ users: 320, percent: 39, from: { index: 1 }, to: { index: 2 } });
  });

  it("returns no insight when nobody dropped", () => {
    expect(findLargestDrop([step(0, 2, 100, 0), step(1, 2, 100, 0)])).toBeNull();
  });
});

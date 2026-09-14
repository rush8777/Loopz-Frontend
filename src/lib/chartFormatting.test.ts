import { describe, expect, it } from "vitest";
import { formatDateTick, formatTooltipDate, getResponsiveDateAxisProps, getResponsiveTickProps } from "./chartFormatting";

describe("chart formatting", () => {
  it("formats compact UTC axis labels", () => {
    expect(formatDateTick("2026-08-15")).toBe("Aug 15");
    expect(formatDateTick("2026-09")).toBe("Sep");
    expect(formatDateTick("2026-08-15", true)).toBe("Aug 15, 2026");
  });

  it("keeps full tooltip date and time context", () => {
    expect(formatTooltipDate("2026-08-15")).toBe("Aug 15, 2026 (UTC)");
    expect(formatTooltipDate("2026-08-15T14:30:00.000Z")).toBe("Aug 15, 2026, 2:30:00 PM UTC");
  });

  it("uses Recharts width-aware tick preservation instead of a fixed count", () => {
    const labels = Array.from({ length: 14 }, (_, index) => `2026-09-${String(index + 1).padStart(2, "0")}`);
    const props = getResponsiveDateAxisProps(labels, 640);
    expect(props.interval).toBe(0);
    expect(props.minTickGap).toBe(36);
    expect(props.ticks).toEqual(["2026-09-01", "2026-09-04", "2026-09-07", "2026-09-10", "2026-09-13"]);
    expect(props.ticks?.includes("2026-09-14")).toBe(false);
    expect(props.ticks?.slice(1).map((tick, index) => Number(String(tick).slice(-2)) - Number(String(props.ticks?.[index]).slice(-2)))).toEqual([3, 3, 3, 3]);
    expect(props.tickFormatter?.("2026-08-15", 0)).toBe("Aug 15");
    expect(getResponsiveTickProps(120).minTickGap).toBe(48);
  });
});

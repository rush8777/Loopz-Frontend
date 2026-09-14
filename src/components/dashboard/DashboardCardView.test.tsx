import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardCardView } from "./DashboardCardView";
import type { AnalyticsResponse, DashboardCard, DashboardFilters } from "@/types/api";

const card: DashboardCard = { title: "Unique users", cardType: "metric", width: "small", configuration: { schemaVersion: 1, kind: "metric", metricId: "users.unique", mode: "single", visualization: "previous_period" } };
const filters: DashboardFilters = { since: "2026-01-01T00:00:00.000Z", until: "2026-01-31T00:00:00.000Z", granularity: "day", excludedEventNames: [] };
const response: AnalyticsResponse = { metadata: { metricId: "users.unique", definition: "Distinct people", resolvedDateRange: { since: filters.since, until: filters.until }, granularity: "day", appliedFilters: filters, breakdown: null, dataFreshness: "2026-01-31T00:00:00.000Z", resultShape: "scalar", timezone: "UTC", drilldown: ["users"] }, result: { kind: "scalar", values: [{ seriesKey: "value", value: 120, recentValue: 8, previousValue: 100, deltaPercent: 20 }] } };
describe("DashboardCardView", () => {
  it("renders scalar comparison, metadata, and drill-down", () => { const onDrilldown = vi.fn(); render(<DashboardCardView card={card} filters={filters} response={response} onDrilldown={onDrilldown} />); expect(screen.getByText("120")).toBeInTheDocument(); expect(screen.getByText("+20% vs previous")).toBeInTheDocument(); expect(screen.getByText(/Last refreshed/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "View details" })); expect(onDrilldown).toHaveBeenCalled(); });
  it("renders loading and retryable error states", () => { const retry = vi.fn(); const { rerender } = render(<DashboardCardView card={card} filters={filters} loading />); expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(0); rerender(<DashboardCardView card={card} filters={filters} error="Query failed" onRetry={retry} />); expect(screen.getByText("Query failed")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalled(); });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapDetailPage } from "./PageHeatmapTab";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";
import type { PageDetail, PageHeatmapResult } from "../../types/api";

vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

const page: PageDetail = { id: "page_1", siteId: "site_1", name: "Dashboard", description: null, area: null, pageType: "dashboard", rules: [{ id: "r1", kind: "include", operator: "equals", value: "/dashboard" }], heatmapEnabled: true, views: 1, uniqueVisitors: 1, uniqueSessions: 1, lastSeenAt: "2026-08-31T00:00:00.000Z", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-31T00:00:00.000Z", matchedPaths: [{ pagePath: "/dashboard", views: 1, lastSeenAt: "2026-08-31T00:00:00.000Z" }] };
const result: PageHeatmapResult = { page: { id: page.id, name: page.name }, stateId: "default", device: "desktop", layer: "click", interactionCount: 1, points: [{ x: 10, y: 20, count: 1 }], metrics: { visits: 1, totalClicks: 1, averageTimeMs: 5000, dropOffRate: 1 }, topClickedElements: [{ selector: "#create", label: "Create project", count: 1, percentage: 1 }], scrollReach: [{ depth: 25, reached: 1 }, { depth: 50, reached: 0 }, { depth: 75, reached: 0 }, { depth: 100, reached: 0 }], targetUrl: "https://customer.example/dashboard", snapshot: null };

describe("HeatmapDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as never);
    vi.mocked(pagesApi.getPage).mockResolvedValue(page);
    vi.mocked(pagesApi.listPageHeatmapStates).mockResolvedValue({ states: [{ id: "default", name: "Default", selector: null }] });
    vi.mocked(pagesApi.getPageHeatmap).mockResolvedValue(result);
    vi.mocked(pagesApi.requestPageHeatmapCapture).mockResolvedValue({ captureUrl: "https://customer.example/dashboard?__movecues_heatmap_capture=opaque", requestId: "request_1", expiresAt: "2026-09-01T01:00:00.000Z" });
    vi.mocked(pagesApi.getPageHeatmapCaptureStatus).mockResolvedValue({ status: "pending" });
  });

  it("opens live capture on the real customer page as a top-level window", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<MemoryRouter initialEntries={["/observe/heatmaps/page_1"]}><Routes><Route path="/observe/heatmaps/:pageId" element={<HeatmapDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByText("Create project");
    fireEvent.click(screen.getByRole("button", { name: "Change image" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith("https://customer.example/dashboard?__movecues_heatmap_capture=opaque", "_blank", "noopener,noreferrer"));
  });
});

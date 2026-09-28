import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PageDetailPage } from "./PageDetailPage";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";
import type { PageDetail } from "../../types/api";

vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

const mockedPages = vi.mocked(pagesApi);
const mockedWorkspace = vi.mocked(workspace);

const page: PageDetail = {
  id: "page_1", siteId: "site_1", name: "Settings", description: null, area: "Account", pageType: "settings",
  rules: [{ id: "r1", kind: "include", operator: "matches_pattern", value: "/account/settings/*" }],
  heatmapEnabled: false,
  views: 12480, uniqueVisitors: 3021, uniqueSessions: 3440, lastSeenAt: "2026-08-31T10:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z",
  matchedPaths: [{ pagePath: "/account/settings/profile", views: 8421, lastSeenAt: "2026-08-31T10:00:00.000Z" }],
};

function renderPage(path = "/observe/pages/page_1") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/observe/pages/:pageId" element={<PageDetailPage />} /></Routes></MemoryRouter>);
}

describe("PageDetailPage MVP1 overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWorkspace.useWorkspace.mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as any);
    mockedPages.getPage.mockResolvedValue(page);
    mockedPages.listHeatmaps.mockResolvedValue({ heatmaps: [{ id: page.id, name: page.name, heatmapEnabled: true, interactions: 18422, clicks: 12000, lastActivityAt: page.lastSeenAt, referenceStatus: "ready", referenceCapturedAt: "2026-08-31T00:00:00.000Z" }] });
  });

  it("shows a non-interactive Heatmaps preview without requesting heatmap data", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Settings" });
    expect(screen.queryByRole("tab", { name: "heatmap" })).not.toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByText(/interactions$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference capture/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open heatmap" })).not.toBeInTheDocument();
    expect(mockedPages.listHeatmaps).not.toHaveBeenCalled();
  });

  it.each(["heatmap", "elements"])("ignores the legacy %s tab and stays on the Page overview", async (tab) => {
    renderPage(`/observe/pages/page_1?tab=${tab}`);
    await screen.findByRole("heading", { name: "Settings" });
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Rules")).toBeInTheDocument();
    expect(mockedPages.listHeatmaps).not.toHaveBeenCalled();
    expect(mockedPages.listPageElements).not.toHaveBeenCalled();
  });

  it("shows metrics, rules, and matched URLs without an Elements tab or element request", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("12,480")).toBeInTheDocument();
    expect(screen.getAllByText("/account/settings/*")).not.toHaveLength(0);
    expect(screen.getByText("/account/settings/profile")).toBeInTheDocument();
    expect(screen.getByText("8,421")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "elements" })).not.toBeInTheDocument();
    expect(mockedPages.listPageElements).not.toHaveBeenCalled();
  });
});

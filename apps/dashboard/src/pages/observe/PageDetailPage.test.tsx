import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PageDetailPage } from "./PageDetailPage";
import * as pagesApi from "../../api/pages";
import * as elementsApi from "../../api/elements";
import * as workspace from "../../auth/WorkspaceContext";
import type { CatalogElement, PageDetail, PageElement } from "../../types/api";

vi.mock("../../api/pages");
vi.mock("../../api/elements");
vi.mock("../../auth/WorkspaceContext");

const mockedPages = vi.mocked(pagesApi);
const mockedElements = vi.mocked(elementsApi);
const mockedWorkspace = vi.mocked(workspace);

const page: PageDetail = {
  id: "page_1", siteId: "site_1", name: "Settings", description: null, area: "Account", pageType: "settings",
  rules: [{ id: "r1", kind: "include", operator: "matches_pattern", value: "/account/settings/*" }],
  heatmapEnabled: false,
  views: 12480, uniqueVisitors: 3021, uniqueSessions: 3440, lastSeenAt: "2026-08-31T10:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-30T00:00:00.000Z", matchedPaths: [],
};

const element: PageElement = {
  id: "el_1", selector: 'button[data-testid="save-settings"]', tagName: "button", label: "Save changes", role: "button",
  source: "crawl", isIgnored: false, seenCount: 8421, firstSeenAt: "2026-08-01T00:00:00.000Z", lastSeenAt: "2026-08-31T10:00:00.000Z",
  matchedPaths: ["/account/settings/profile", "/account/settings/security"],
};

function renderPage() {
  return render(<MemoryRouter initialEntries={["/observe/pages/page_1"]}><Routes><Route path="/observe/pages/:pageId" element={<PageDetailPage />} /></Routes></MemoryRouter>);
}

describe("PageDetailPage elements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWorkspace.useWorkspace.mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as any);
    mockedPages.getPage.mockResolvedValue(page);
    mockedPages.listPageElements.mockResolvedValue({ elements: [element] });
    mockedPages.listHeatmaps.mockResolvedValue({ heatmaps: [{ id: page.id, name: page.name, heatmapEnabled: true, interactions: 18422, clicks: 12000, lastActivityAt: page.lastSeenAt, referenceStatus: "ready", referenceCapturedAt: "2026-08-31T00:00:00.000Z" }] });
  });

  it("shows only Overview and Elements and opens the dedicated Heatmap route", async () => {
    render(<MemoryRouter initialEntries={["/observe/pages/page_1"]}><Routes><Route path="/observe/pages/:pageId" element={<PageDetailPage />} /><Route path="/observe/heatmaps/:pageId" element={<div>Dedicated heatmap</div>} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { name: "Settings" });
    expect(screen.queryByRole("tab", { name: "heatmap" })).not.toBeInTheDocument();
    expect(screen.getByText("18,422 interactions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open heatmap" }));
    expect(await screen.findByText("Dedicated heatmap")).toBeInTheDocument();
  });

  it("keeps the logical Page header and shows aggregated elements in its Elements tab", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "elements" }));

    expect(await screen.findByText("Save changes")).toBeInTheDocument();
    expect(screen.getByText(element.selector)).toBeInTheDocument();
    expect(screen.getByText("8,421")).toBeInTheDocument();
    expect(mockedPages.listPageElements).toHaveBeenCalledWith("org_1", "site_1", "page_1");
  });

  it("reuses the existing ignore control without replacing Page-specific sighting totals", async () => {
    const updated: CatalogElement = { ...element, isIgnored: true, seenCount: 99999 };
    mockedElements.updateElement.mockResolvedValue(updated);
    renderPage();
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.click(screen.getByRole("tab", { name: "elements" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ignore" }));

    await waitFor(() => expect(mockedElements.updateElement).toHaveBeenCalledWith("org_1", "site_1", "el_1", { isIgnored: true }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show ignored" }));
    expect(screen.getByText("8,421")).toBeInTheDocument();
    expect(screen.getByText("Ignored")).toBeInTheDocument();
  });
});

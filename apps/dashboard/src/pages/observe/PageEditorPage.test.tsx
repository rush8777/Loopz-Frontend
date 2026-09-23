import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageEditorPage } from "./PageEditorPage";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";
import type { PageDetail } from "../../types/api";

vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

const page: PageDetail = {
  id: "page_1", siteId: "site_1", name: "Settings", description: null, area: null, pageType: "settings",
  rules: [{ id: "r1", kind: "include", operator: "equals", value: "/settings" }], heatmapEnabled: true,
  views: 0, uniqueVisitors: 0, uniqueSessions: 0, lastSeenAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01", matchedPaths: [],
};

describe("PageEditorPage MVP1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as never);
    vi.mocked(pagesApi.createPage).mockResolvedValue(page);
    vi.mocked(pagesApi.updatePage).mockResolvedValue(page);
    vi.mocked(pagesApi.getPage).mockResolvedValue(page);
  });

  it("creates a Page without exposing or submitting heatmap state", async () => {
    render(<MemoryRouter initialEntries={["/observe/pages/new"]}><Routes>
      <Route path="/observe/pages/new" element={<PageEditorPage />} />
      <Route path="/observe/pages/:pageId" element={<div>Saved</div>} />
    </Routes></MemoryRouter>);
    expect(screen.queryByText("Heatmaps enabled for this Page")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Product Detail"), { target: { value: "Settings" } });
    fireEvent.change(screen.getByPlaceholderText("/products"), { target: { value: "/settings" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Page" }));
    await waitFor(() => expect(pagesApi.createPage).toHaveBeenCalled());
    expect(vi.mocked(pagesApi.createPage).mock.calls[0][2]).not.toHaveProperty("heatmapEnabled");
  });

  it("edits a Page without overwriting its dormant heatmap value", async () => {
    render(<MemoryRouter initialEntries={["/observe/pages/page_1/edit"]}><Routes>
      <Route path="/observe/pages/:pageId/edit" element={<PageEditorPage />} />
      <Route path="/observe/pages/:pageId" element={<div>Saved</div>} />
    </Routes></MemoryRouter>);
    await screen.findByDisplayValue("Settings");
    expect(screen.queryByText("Heatmaps enabled for this Page")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(pagesApi.updatePage).toHaveBeenCalled());
    expect(vi.mocked(pagesApi.updatePage).mock.calls[0][3]).not.toHaveProperty("heatmapEnabled");
  });
});

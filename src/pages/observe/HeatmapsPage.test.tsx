import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapsPage } from "./HeatmapsPage";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

describe("HeatmapsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1", name: "Site" } } as never);
    vi.mocked(pagesApi.listHeatmaps).mockResolvedValue({ heatmaps: [
      { id: "page_active", name: "Dashboard", heatmapEnabled: true, interactions: 42, clicks: 30, lastActivityAt: "2026-08-31T00:00:00.000Z", referenceStatus: "ready", referenceCapturedAt: "2026-08-31T00:00:00.000Z" },
      { id: "page_disabled", name: "Settings", heatmapEnabled: false, interactions: 0, clicks: 0, lastActivityAt: null, referenceStatus: "needed", referenceCapturedAt: null },
    ] });
  });

  it("lists Page heatmaps and routes analysis into the dedicated Heatmap workspace", async () => {
    render(<MemoryRouter initialEntries={["/observe/heatmaps"]}><Routes>
      <Route path="/observe/heatmaps" element={<HeatmapsPage />} />
      <Route path="/observe/heatmaps/:pageId" element={<div>Page heatmap detail</div>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dashboard"));
    await waitFor(() => expect(screen.getByText("Page heatmap detail")).toBeInTheDocument());
  });
});

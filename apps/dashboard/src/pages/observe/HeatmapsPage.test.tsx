import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapsPage } from "./HeatmapsPage";
import * as pagesApi from "../../api/pages";

vi.mock("../../api/pages");

describe("Heatmaps Coming Soon", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["/observe/heatmaps", "/observe/heatmaps/page_1"])("renders a static Coming Soon screen at %s without loading heatmap data", (path) => {
    render(<MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/observe/heatmaps" element={<HeatmapsPage />} />
      <Route path="/observe/heatmaps/:pageId" element={<HeatmapsPage />} />
    </Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Heatmaps" })).toBeInTheDocument();
    expect(screen.getByText("See where users click, scroll, hover, and focus across your product. Heatmaps are coming soon.")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(vi.mocked(pagesApi.listHeatmaps)).not.toHaveBeenCalled();
    expect(vi.mocked(pagesApi.getPageHeatmap)).not.toHaveBeenCalled();
  });
});

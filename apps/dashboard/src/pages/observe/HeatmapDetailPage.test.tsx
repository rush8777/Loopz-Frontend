import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HeatmapsPage } from "./HeatmapsPage";

describe("Heatmap deep links", () => {
  it("cannot expose the dormant interactive heatmap workspace", () => {
    render(<MemoryRouter initialEntries={["/observe/heatmaps/page_1"]}><Routes>
      <Route path="/observe/heatmaps/:pageId" element={<HeatmapsPage />} />
    </Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Heatmaps" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /capture/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/interactions/i)).not.toBeInTheDocument();
  });
});

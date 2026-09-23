import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import * as workspace from "@/auth/WorkspaceContext";

vi.mock("@/auth/WorkspaceContext");

describe("Sidebar Heatmaps navigation", () => {
  beforeEach(() => {
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentSite: { id: "site_1", name: "Site" } } as never);
  });

  it("shows Heatmaps as Soon and non-navigable", () => {
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("Heatmaps")).toBeInTheDocument();
    expect(screen.getByText("Soon")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heatmaps" })).not.toBeInTheDocument();
    expect(screen.getByText("Heatmaps").closest("[aria-disabled=true]")).not.toBeNull();
  });
});

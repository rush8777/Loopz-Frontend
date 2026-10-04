import { fireEvent, render, screen } from "@testing-library/react";
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

  it("reveals the unlisted experience widgets from the Other hover menu", () => {
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByRole("menu", { name: "Other experience types" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Anchored cards" })).toHaveAttribute("href", "/experiences/anchored-cards");
    expect(screen.getByRole("menuitem", { name: "Toasts" })).toHaveAttribute("href", "/experiences/toasts");
    expect(screen.getByRole("menuitem", { name: "Cursor followers" })).toHaveAttribute("href", "/experiences/cursor-followers");
    expect(screen.getByRole("menuitem", { name: "Modals" })).toHaveAttribute("href", "/experiences/modals");
    expect(screen.getByRole("menuitem", { name: "Slideouts" })).toHaveAttribute("href", "/experiences/slideouts");
    expect(screen.getByRole("menuitem", { name: "Hotspots" })).toHaveAttribute("href", "/experiences/hotspots");
  });
});

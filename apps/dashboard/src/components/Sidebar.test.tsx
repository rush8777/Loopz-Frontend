import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import * as workspace from "@/auth/WorkspaceContext";

vi.mock("@/auth/WorkspaceContext");

describe("Sidebar navigation", () => {
  beforeEach(() => {
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentSite: { id: "site_1", name: "Site" } } as never);
  });

  it("does not show Heatmaps", () => {
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText("Heatmaps")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Heatmaps" })).not.toBeInTheDocument();
  });

  it("reveals the unlisted experience widgets from the Other hover menu", () => {
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Experiences" }));
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByRole("menu", { name: "Other experience types" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Anchored cards" })).toHaveAttribute("href", "/experiences/anchored-cards");
    expect(screen.getByRole("menuitem", { name: "Toasts" })).toHaveAttribute("href", "/experiences/toasts");
    expect(screen.getByRole("menuitem", { name: "Cursor followers" })).toHaveAttribute("href", "/experiences/cursor-followers");
    expect(screen.getByRole("menuitem", { name: "Modals" })).toHaveAttribute("href", "/experiences/modals");
    expect(screen.getByRole("menuitem", { name: "Slideouts" })).toHaveAttribute("href", "/experiences/slideouts");
    expect(screen.getByRole("menuitem", { name: "Hotspots" })).toHaveAttribute("href", "/experiences/hotspots");
  });
  it("links to the authenticated Geo workspace", () => {
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Geo" })).toHaveAttribute("href", "/ai");
  });
  it("groups navigation and preserves the Knowledge permission", () => {
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentSite: { name: "Site" }, currentOrg: { role: "ADMIN" } } as never);
    render(<MemoryRouter><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("Workspace").parentElement).toHaveTextContent("OverviewDashboardsGeo");
    const adoption = screen.getByText("AI Adoption").parentElement!;
    const group = within(adoption);
    expect(group.getAllByRole("button", { name: "Geo Agent" })).toHaveLength(1);
    expect(group.queryByRole("link", { name: "Geo Agent" })).toBeNull();
    expect(group.getByRole("button", { name: "Geo Agent" })).toHaveAttribute("aria-expanded", "false");
    expect(group.queryByRole("link", { name: "Knowledge" })).toBeNull();
    fireEvent.click(group.getByRole("button", { name: "Geo Agent" }));
    for (const [name, path] of [["Overview", "/experiences/geo-agents"], ["Skills", "/experiences/geo-agents/skills"],
      ["Behaviour", "/experiences/geo-agents/behaviour"], ["Knowledge", "/knowledge"],
      ["Conversations", "/experiences/geo-agents/conversations"], ["Appearance", "/experiences/geo-agents/appearance"]]) {
      expect(group.getByRole("link", { name })).toHaveAttribute("href", path);
    }
    expect(screen.getByRole("button", { name: "Experiences" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Surveys" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Experiences" }));
    for (const name of ["Surveys", "Guides", "Checklists"]) expect(screen.getByRole("link", { name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Experiences" }));
    expect(screen.queryByRole("link", { name: "Surveys" })).not.toBeInTheDocument();
  });

  it.each(["/experiences/surveys", "/experiences/guides", "/experiences/checklists", "/experiences/toasts"]) ("opens Experiences for %s", path => {
    render(<MemoryRouter initialEntries={[path]}><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Experiences" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps Experiences closed for Geo Agent and hides Knowledge from non-admins", () => {
    render(<MemoryRouter initialEntries={["/experiences/geo-agents"]}><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Experiences" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Geo Agent" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("link", { name: "Knowledge" })).not.toBeInTheDocument();
  });

  it.each([["/knowledge", "Knowledge"], ["/experiences/geo-agents/skills", "Skills"], ["/experiences/geo-agents/appearance", "Appearance"],
    ["/experiences/geo-agents/behaviour", "Behaviour"], ["/experiences/geo-agents/conversations", "Conversations"]]
  )("opens Geo Agent at %s and marks %s current", (path, name) => {
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { role: "ADMIN" } } as never);
    render(<MemoryRouter initialEntries={[path]}><Sidebar onOpenSettings={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Geo Agent" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Experiences" })).toHaveAttribute("aria-expanded", "false");
  });

});

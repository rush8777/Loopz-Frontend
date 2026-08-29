import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SegmentsPage } from "./SegmentsPage";
import * as segmentsApi from "../../api/segments";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/segments");
vi.mock("../../auth/WorkspaceContext");

const mockedSegmentsApi = vi.mocked(segmentsApi);
const mockedWorkspace = vi.mocked(workspace);

function mockWorkspaceReady() {
  mockedWorkspace.useWorkspace.mockReturnValue({
    orgs: [],
    currentOrg: { id: "org_1", orgId: "org_1", name: "Acme" } as any,
    setCurrentOrgId: vi.fn(),
    sites: [],
    currentSite: { id: "site_1", siteId: "site_1", name: "Acme site" } as any,
    setCurrentSiteId: vi.fn(),
    loading: false,
    error: null,
    refreshSites: vi.fn(),
  });
}

const sampleSegment = {
  id: "seg_1",
  siteId: "site_1",
  name: "High-intent trial users",
  description: "Started checkout but haven't completed it",
  definition: { logic: "and" as const, conditions: [] },
  audienceCount: 1284,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

describe("SegmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state when no segments exist", async () => {
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockResolvedValue({ segments: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no segments yet/i)).toBeInTheDocument();
  });

  it("renders the segment list with audience counts", async () => {
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockResolvedValue({ segments: [sampleSegment], total: 1, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("High-intent trial users")).toBeInTheDocument();
    expect(screen.getByText("1,284 users")).toBeInTheDocument();
  });

  it("issues a server-side search request when typing, rather than filtering client-side", async () => {
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockResolvedValue({ segments: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockedSegmentsApi.listSegments).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/search segments/i), { target: { value: "trial" } });

    await waitFor(() =>
      expect(mockedSegmentsApi.listSegments).toHaveBeenCalledWith("org_1", "site_1", expect.objectContaining({ search: "trial" }))
    );
  });

  it("shows a loading skeleton before data arrives", () => {
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  it("shows an error banner when the request fails", async () => {
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockRejectedValue(new Error("network error"));

    render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/couldn't load segments/i)).toBeInTheDocument();
  });

  it("prompts to select a site when none is active", () => {
    mockedWorkspace.useWorkspace.mockReturnValue({
      orgs: [],
      currentOrg: null,
      setCurrentOrgId: vi.fn(),
      sites: [],
      currentSite: null,
      setCurrentSiteId: vi.fn(),
      loading: false,
      error: null,
      refreshSites: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SegmentsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/no site selected/i)).toBeInTheDocument();
  });
});

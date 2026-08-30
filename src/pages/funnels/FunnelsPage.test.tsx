import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FunnelsPage } from "./FunnelsPage";
import * as funnelsApi from "../../api/funnels";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/funnels");
vi.mock("../../auth/WorkspaceContext");

const mockedFunnelsApi = vi.mocked(funnelsApi);
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

const sampleFunnel = {
  id: "fun_1",
  siteId: "site_1",
  name: "Signup activation",
  description: "Main signup activation flow",
  steps: [
    { type: "event" as const, eventName: "signup_started" },
    { type: "event" as const, eventName: "signup_completed" },
  ],
  conversionWindowMinutes: 1440,
  stepCount: 4,
  overallConversion: 39,
  totalUsers: 10000,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

describe("FunnelsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state when no funnels exist", async () => {
    mockWorkspaceReady();
    mockedFunnelsApi.listFunnels.mockResolvedValue({ funnels: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <FunnelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no funnels yet/i)).toBeInTheDocument();
  });

  it("renders the funnel list with step count and conversion", async () => {
    mockWorkspaceReady();
    mockedFunnelsApi.listFunnels.mockResolvedValue({ funnels: [sampleFunnel], total: 1, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <FunnelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Signup activation")).toBeInTheDocument();
    expect(screen.getByText("4 steps")).toBeInTheDocument();
    expect(screen.getByText("39% conversion")).toBeInTheDocument();
  });

  it("issues a server-side search request when typing", async () => {
    mockWorkspaceReady();
    mockedFunnelsApi.listFunnels.mockResolvedValue({ funnels: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <FunnelsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockedFunnelsApi.listFunnels).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/search funnels/i), { target: { value: "checkout" } });

    await waitFor(() =>
      expect(mockedFunnelsApi.listFunnels).toHaveBeenCalledWith("org_1", "site_1", expect.objectContaining({ search: "checkout" }))
    );
  });

  it("shows a loading skeleton before data arrives", () => {
    mockWorkspaceReady();
    mockedFunnelsApi.listFunnels.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter>
        <FunnelsPage />
      </MemoryRouter>
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  it("shows an error banner when the request fails", async () => {
    mockWorkspaceReady();
    mockedFunnelsApi.listFunnels.mockRejectedValue(new Error("network error"));

    render(
      <MemoryRouter>
        <FunnelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/couldn't load funnels/i)).toBeInTheDocument();
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
        <FunnelsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/no site selected/i)).toBeInTheDocument();
  });
});

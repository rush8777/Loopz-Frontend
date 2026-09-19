import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EventsPage } from "./EventsPage";
import * as eventsApi from "../../api/events";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/events");
vi.mock("../../auth/WorkspaceContext");

const mockedEventsApi = vi.mocked(eventsApi);
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

describe("EventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state prompting analytics.event() when no events exist", async () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no events recorded yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/analytics\.event/).length).toBeGreaterThan(0);
  });

  it("renders the event catalog list with occurrences/users/sessions", async () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockResolvedValue({
      events: [
        {
          name: "checkout_completed",
          occurrences: 1284,
          uniqueUsers: 892,
          sessions: 1041,
          firstSeenAt: "2026-08-02T00:00:00.000Z",
          lastSeenAt: "2026-08-28T00:00:00.000Z",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("checkout_completed")).toBeInTheDocument();
    expect(screen.getByText("1,284")).toBeInTheDocument();
    expect(screen.getByText("892 users")).toBeInTheDocument();
    expect(screen.getByText("1,041 sessions")).toBeInTheDocument();
  });

  it("does not render events as autocaptured interactions - no 'Clicked'/'Hovered' labels appear", async () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockResolvedValue({
      events: [
        {
          name: "checkout_completed",
          occurrences: 5,
          uniqueUsers: 3,
          sessions: 4,
          firstSeenAt: "2026-08-02T00:00:00.000Z",
          lastSeenAt: "2026-08-28T00:00:00.000Z",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    await screen.findByText("checkout_completed");
    expect(screen.queryByText(/clicked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hovered/i)).not.toBeInTheDocument();
  });

  it("issues a server-side search request when typing in the search box, rather than filtering client-side", async () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(mockedEventsApi.listEvents).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/search events/i), { target: { value: "checkout" } });

    await waitFor(() =>
      expect(mockedEventsApi.listEvents).toHaveBeenCalledWith("org_1", "site_1", expect.objectContaining({ search: "checkout" }))
    );
  });

  it("shows a loading skeleton before data arrives", () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  it("shows an error banner when the request fails", async () => {
    mockWorkspaceReady();
    mockedEventsApi.listEvents.mockRejectedValue(new Error("network error"));

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/couldn't load events/i)).toBeInTheDocument();
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
        <EventsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/no site selected/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EventDetailPage } from "./EventDetailPage";
import * as eventsApi from "../../api/events";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/events");
vi.mock("../../auth/WorkspaceContext");

const mockedEventsApi = vi.mocked(eventsApi);
const mockedWorkspace = vi.mocked(workspace);

function renderDetail(eventName = "checkout_completed") {
  return render(
    <MemoryRouter initialEntries={[`/observe/events/${eventName}`]}>
      <Routes>
        <Route path="/observe/events/:eventName" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EventDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockedEventsApi.getEventSummary.mockResolvedValue({
      name: "checkout_completed",
      occurrences: 1284,
      uniqueUsers: 892,
      sessions: 1041,
      firstSeenAt: "2026-08-02T00:00:00.000Z",
      lastSeenAt: "2026-08-28T00:00:00.000Z",
      usedIn: { patterns: [] },
    });
    mockedEventsApi.getEventTimeseries.mockResolvedValue({
      points: [{ date: "2026-08-28", count: 5 }],
      since: "2026-08-28T00:00:00.000Z",
      until: "2026-08-28T00:00:00.000Z",
    });
  });

  it("renders occurrence/user/session summary numbers", async () => {
    mockedEventsApi.getEventProperties.mockResolvedValue({ properties: [], sampledOccurrences: 0, totalOccurrences: 0 });
    renderDetail();

    expect(await screen.findByText("1,284")).toBeInTheDocument();
    expect(screen.getByText("892")).toBeInTheDocument();
    expect(screen.getByText("1,041")).toBeInTheDocument();
  });

  it("renders discovered properties with percent breakdowns for categorical values", async () => {
    mockedEventsApi.getEventProperties.mockResolvedValue({
      properties: [
        {
          name: "plan",
          type: "string",
          sampleCount: 4,
          values: [
            { value: "pro", count: 3, percent: 75 },
            { value: "free", count: 1, percent: 25 },
          ],
        },
      ],
      sampledOccurrences: 4,
      totalOccurrences: 4,
    });
    renderDetail();

    expect(await screen.findByText("plan")).toBeInTheDocument();
    expect(screen.getByText("pro")).toBeInTheDocument();
    expect(screen.getByText(/75% \(3\)/)).toBeInTheDocument();
  });

  it("renders numeric properties with min/median/max", async () => {
    mockedEventsApi.getEventProperties.mockResolvedValue({
      properties: [{ name: "amount", type: "number", sampleCount: 3, min: 9, median: 49, max: 499 }],
      sampledOccurrences: 3,
      totalOccurrences: 3,
    });
    renderDetail();

    expect(await screen.findByText("amount")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("49")).toBeInTheDocument();
    expect(screen.getByText("499")).toBeInTheDocument();
  });

  it("shows an empty state when the event has no properties", async () => {
    mockedEventsApi.getEventProperties.mockResolvedValue({ properties: [], sampledOccurrences: 0, totalOccurrences: 0 });
    renderDetail();

    expect(await screen.findByText(/no properties recorded for this event/i)).toBeInTheDocument();
  });

  it("shows a not-found empty state for an event that never occurred", async () => {
    mockedEventsApi.getEventSummary.mockRejectedValue({ status: 404 });
    renderDetail("never_happened");

    expect(await screen.findByText(/event not found/i)).toBeInTheDocument();
  });
});

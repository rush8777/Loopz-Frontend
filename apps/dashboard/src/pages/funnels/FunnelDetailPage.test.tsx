import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { FunnelDetailPage } from "./FunnelDetailPage";
import * as funnelsApi from "../../api/funnels";
import * as segmentsApi from "../../api/segments";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/funnels");
vi.mock("../../api/segments");
vi.mock("../../auth/WorkspaceContext");

const mockedFunnelsApi = vi.mocked(funnelsApi);
const mockedSegmentsApi = vi.mocked(segmentsApi);
const mockedWorkspace = vi.mocked(workspace);

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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

function renderDetail(funnelId = "fun_1") {
  return render(
    <MemoryRouter initialEntries={[`/observe/funnels/${funnelId}`]}>
      <Routes>
        <Route path="/observe/funnels/:funnelId" element={<FunnelDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const sampleFunnel = {
  id: "fun_1",
  siteId: "site_1",
  name: "Signup Activation",
  description: "Main signup flow",
  steps: [
    { type: "event" as const, eventName: "signup_started", label: "Signup Started" },
    { type: "event" as const, eventName: "signup_completed", label: "Signup Completed" },
  ],
  conversionWindowMinutes: 1440,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

const sampleAnalysis = {
  steps: [
    { index: 0, type: "event" as const, label: "Signup Started", eventName: "signup_started", users: 10000, conversionFromStart: 100, conversionFromPrevious: 100, droppedBeforeNext: 2500 },
    { index: 1, type: "event" as const, label: "Signup Completed", eventName: "signup_completed", users: 7500, conversionFromStart: 75, conversionFromPrevious: 75, droppedBeforeNext: 0 },
  ],
  totalUsers: 10000,
  convertedUsers: 7500,
  overallConversion: 75,
  trend: [{ date: "2026-08-27", startedUsers: 100, convertedUsers: 75, conversion: 75 }],
  since: "2026-08-01T00:00:00.000Z",
  until: "2026-08-28T00:00:00.000Z",
};

describe("FunnelDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceReady();
    mockedSegmentsApi.listSegments.mockResolvedValue({ segments: [], total: 0, limit: 100, offset: 0 });
  });

  it("renders the funnel name, conversion metrics, and step bars", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);

    renderDetail();

    expect(await screen.findByText("Signup Activation")).toBeInTheDocument();
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10,000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7,500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signup Started").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signup Completed").length).toBeGreaterThan(0);
    expect(screen.getByText(/2,500 dropped/)).toBeInTheDocument();
  });

  it("re-requests analysis with an updated range when the date range changes", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);

    renderDetail();
    await screen.findByText("Signup Activation");
    await waitFor(() => expect(mockedFunnelsApi.analyzeFunnel).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "7 days" }));

    await waitFor(() => {
      const lastCall = mockedFunnelsApi.analyzeFunnel.mock.calls.at(-1)!;
      const sinceMs = new Date(lastCall[3].since).getTime();
      const daysAgo = (Date.now() - sinceMs) / (24 * 60 * 60 * 1000);
      expect(daysAgo).toBeLessThan(8); // was ~30 days before the click
    });
  });

  it("re-requests analysis restricted to a segment when one is selected", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedSegmentsApi.listSegments.mockResolvedValue({
      segments: [{ id: "seg_1", siteId: "site_1", name: "Free users", description: null, definition: { logic: "and", conditions: [] }, audienceCount: 5, createdAt: "", updatedAt: "" }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    renderDetail();
    await screen.findByText("Signup Activation");
    await waitFor(() => expect(screen.getByText("Free users")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("All users"), { target: { value: "seg_1" } });

    await waitFor(() =>
      expect(mockedFunnelsApi.analyzeFunnel).toHaveBeenLastCalledWith("org_1", "site_1", "fun_1", expect.anything(), expect.objectContaining({ segmentId: "seg_1" }))
    );
  });

  it("opens a step's user list and navigates to the existing User Profile page", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedFunnelsApi.getFunnelStepUsers.mockResolvedValue({
      users: [{ identityType: "identified", trackedUserId: "tru_1", externalUserId: "user_42", anonymousId: null, lastSeenAt: "2026-08-28T00:00:00.000Z" }],
      total: 1,
      limit: 25,
      offset: 0,
    });

    renderDetail();
    await screen.findByText("Signup Activation");

    fireEvent.click(screen.getAllByText("10,000")[1]);
    const row = await screen.findByText("user_42");
    fireEvent.click(row.closest("tr")!);

    expect(mockNavigate).toHaveBeenCalledWith("/users/tru_1");
  });

  it("navigates an anonymous step user to the Anonymous Visitor page", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedFunnelsApi.getFunnelStepUsers.mockResolvedValue({
      users: [{ identityType: "anonymous", trackedUserId: null, externalUserId: null, anonymousId: "anon_99", lastSeenAt: null }],
      total: 1,
      limit: 25,
      offset: 0,
    });

    renderDetail();
    await screen.findByText("Signup Activation");

    fireEvent.click(screen.getAllByText("10,000")[1]);
    const row = await screen.findByText("anon_99");
    fireEvent.click(row.closest("tr")!);

    expect(mockNavigate).toHaveBeenCalledWith("/users/anonymous/anon_99");
  });

  it("creates a dynamic drop-off segment from a step and navigates to it", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedSegmentsApi.createSegment.mockResolvedValue({ id: "seg_drop", siteId: "site_1", name: "Signup Activation — Signup Started drop-offs", description: null, definition: { logic: "and", conditions: [] }, audienceCount: 0, createdAt: "", updatedAt: "" });

    renderDetail();
    await screen.findByText("Signup Activation");
    expect(screen.getByText("Action")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Create segment")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Dropped after this step/ }));

    const name = await screen.findByLabelText("Segment name");
    expect(name).toHaveValue("Signup Activation — Signup Started drop-offs");
    fireEvent.click(screen.getByRole("button", { name: "Create segment" }));

    await waitFor(() => expect(mockedSegmentsApi.createSegment).toHaveBeenCalledWith("org_1", "site_1", expect.objectContaining({
      name: "Signup Activation — Signup Started drop-offs",
      definition: { logic: "and", conditions: [expect.objectContaining({ type: "funnel_cohort", funnelId: "fun_1", stepIndex: 0, cohort: "dropped_after", conversionWindowMinutes: 1440, dateRange: { type: "relative", days: 30 } })] },
    })));
    expect(mockNavigate).toHaveBeenCalledWith("/segments/seg_drop");
  });

  it("ANDs the selected analysis segment definition into a new cohort", async () => {
    const selectedDefinition = { logic: "and" as const, conditions: [{ type: "event" as const, eventName: "trial_started", operator: "performed" as const }] };
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedSegmentsApi.listSegments.mockResolvedValue({ segments: [{ id: "seg_free", siteId: "site_1", name: "Free users", description: null, definition: selectedDefinition, audienceCount: 1, createdAt: "", updatedAt: "" }], total: 1, limit: 100, offset: 0 });
    mockedSegmentsApi.createSegment.mockResolvedValue({ id: "seg_reached", siteId: "site_1", name: "Reached", description: null, definition: { logic: "and", conditions: [] }, audienceCount: 0, createdAt: "", updatedAt: "" });

    renderDetail();
    await screen.findByText("Free users");
    fireEvent.change(screen.getByDisplayValue("All users"), { target: { value: "seg_free" } });
    await waitFor(() => expect(mockedFunnelsApi.analyzeFunnel).toHaveBeenLastCalledWith("org_1", "site_1", "fun_1", expect.anything(), expect.objectContaining({ segmentId: "seg_free" })));
    await screen.findByText("Action");
    fireEvent.click(screen.getAllByText("Create segment")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Reached this step/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Create segment" }));

    await waitFor(() => expect(mockedSegmentsApi.createSegment).toHaveBeenCalledWith("org_1", "site_1", expect.objectContaining({
      definition: { logic: "and", conditions: [selectedDefinition, expect.objectContaining({ type: "funnel_cohort", cohort: "reached" })] },
    })));
  });

  it("offers the final step as the completed funnel cohort", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    renderDetail();
    await screen.findByText("Signup Activation");
    fireEvent.click(screen.getAllByText("Create segment")[1]);
    const finalStepActions = screen.getAllByText("Create segment")[1].closest("details")!;
    expect(within(finalStepActions).getByRole("button", { name: /Completed funnel/ })).toBeInTheDocument();
    expect(within(finalStepActions).queryByRole("button", { name: /Dropped after this step/ })).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and navigates away once deleted", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue(sampleFunnel);
    mockedFunnelsApi.analyzeFunnel.mockResolvedValue(sampleAnalysis);
    mockedFunnelsApi.deleteFunnel.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderDetail();
    fireEvent.click(await screen.findByText("Delete"));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockedFunnelsApi.deleteFunnel).toHaveBeenCalledWith("org_1", "site_1", "fun_1"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/observe/funnels"));
  });

  it("shows an error banner when the funnel fails to load", async () => {
    mockedFunnelsApi.getFunnel.mockRejectedValue(new Error("network error"));

    renderDetail();
    expect(await screen.findByText(/couldn't load this funnel/i)).toBeInTheDocument();
  });
});

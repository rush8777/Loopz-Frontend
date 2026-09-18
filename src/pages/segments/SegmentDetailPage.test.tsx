import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SegmentDetailPage } from "./SegmentDetailPage";
import * as segmentsApi from "../../api/segments";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/segments");
vi.mock("../../auth/WorkspaceContext");

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

function renderDetail(segmentId = "seg_1") {
  return render(
    <MemoryRouter initialEntries={[`/segments/${segmentId}`]}>
      <Routes>
        <Route path="/segments/:segmentId" element={<SegmentDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const sampleSegment = {
  id: "seg_1",
  siteId: "site_1",
  name: "High-intent trial users",
  description: "Started checkout but haven't completed it",
  definition: {
    logic: "and" as const,
    conditions: [
      { type: "event" as const, eventName: "checkout_started", operator: "performed" as const },
      { type: "event" as const, eventName: "checkout_completed", operator: "not_performed" as const },
    ],
  },
  audienceCount: 1284,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
};

describe("SegmentDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceReady();
    mockedSegmentsApi.getSegmentMembers.mockResolvedValue({ members: [], total: 0, limit: 25, offset: 0 });
  });

  it("renders the segment name, audience count, and definition", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);

    renderDetail();

    expect(await screen.findByText("High-intent trial users")).toBeInTheDocument();
    expect(screen.getByText("1,284")).toBeInTheDocument();
    expect(screen.getByText(/checkout_started performed/)).toBeInTheDocument();
    expect(screen.getByText(/checkout_completed not performed/)).toBeInTheDocument();
  });

  it("shows an empty state when no users currently match", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);

    renderDetail();

    expect(await screen.findByText(/no users match yet/i)).toBeInTheDocument();
  });

  it("navigates to the existing User Profile page when an identified member is clicked", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);
    mockedSegmentsApi.getSegmentMembers.mockResolvedValue({
      members: [{ identityType: "identified", trackedUserId: "tru_1", externalUserId: "user_42", anonymousId: null, lastSeenAt: "2026-08-28T00:00:00.000Z" }],
      total: 1,
      limit: 25,
      offset: 0,
    });

    renderDetail();

    const row = await screen.findByText("user_42");
    fireEvent.click(row.closest("tr")!);
    expect(mockNavigate).toHaveBeenCalledWith("/users/tru_1");
  });

  it("navigates to the existing Anonymous Visitor page when an anonymous member is clicked", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);
    mockedSegmentsApi.getSegmentMembers.mockResolvedValue({
      members: [{ identityType: "anonymous", trackedUserId: null, externalUserId: null, anonymousId: "anon_99", lastSeenAt: null }],
      total: 1,
      limit: 25,
      offset: 0,
    });

    renderDetail();

    const row = await screen.findByText("anon_99");
    fireEvent.click(row.closest("tr")!);
    expect(mockNavigate).toHaveBeenCalledWith("/users/anonymous/anon_99");
  });

  it("asks for confirmation before deleting, and navigates away once deleted", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);
    mockedSegmentsApi.deleteSegment.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderDetail();

    fireEvent.click(await screen.findByText("Delete"));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockedSegmentsApi.deleteSegment).toHaveBeenCalledWith("org_1", "site_1", "seg_1"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/segments"));
  });

  it("does not delete when the confirmation is declined", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue(sampleSegment);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderDetail();

    fireEvent.click(await screen.findByText("Delete"));
    expect(mockedSegmentsApi.deleteSegment).not.toHaveBeenCalled();
  });

  it("shows an error banner when the segment fails to load", async () => {
    mockedSegmentsApi.getSegment.mockRejectedValue(new Error("network error"));

    renderDetail();

    expect(await screen.findByText(/couldn't load this segment/i)).toBeInTheDocument();
  });
});

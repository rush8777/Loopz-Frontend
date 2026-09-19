import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SegmentBuilderPage } from "./SegmentBuilderPage";
import * as segmentsApi from "../../api/segments";
import * as eventsApi from "../../api/events";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/segments");
vi.mock("../../api/events");
vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

const mockedSegmentsApi = vi.mocked(segmentsApi);
const mockedEventsApi = vi.mocked(eventsApi);
const mockedPagesApi = vi.mocked(pagesApi);
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

beforeEach(() => {
  vi.clearAllMocks();
  mockWorkspaceReady();
  mockedEventsApi.listEvents.mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 });
  mockedPagesApi.listPages.mockResolvedValue({ pages: [] });
});

describe("SegmentBuilderPage", () => {
  it("starts with a single ALL group and one event condition", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Create segment")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("event_name")).toBeInTheDocument();
  });

  it("requests a live audience preview once the condition is filled in, debounced", async () => {
    mockedSegmentsApi.previewSegment.mockResolvedValue({ audienceCount: 42 });

    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByPlaceholderText("event_name"), { target: { value: "checkout_started" } });

    await waitFor(() => expect(mockedSegmentsApi.previewSegment).toHaveBeenCalled());
    expect(await screen.findByText("42 users")).toBeInTheDocument();
  });

  it("does not request a preview while the definition is incomplete", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    await screen.findByPlaceholderText("event_name");
    await new Promise((r) => setTimeout(r, 500));
    expect(mockedSegmentsApi.previewSegment).not.toHaveBeenCalled();
  });

  it("adds a nested group with '+ Add group'", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    await screen.findByPlaceholderText("event_name");
    const initialLogicSelectors = screen.getAllByDisplayValue("ALL").length;
    fireEvent.click(screen.getByText("+ Add group"));

    await waitFor(() => expect(screen.getAllByDisplayValue("ALL").length).toBe(initialLogicSelectors + 1));
  });

  it("switches a group's logic between ALL and ANY", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    await screen.findByPlaceholderText("event_name");
    const logicSelect = screen.getAllByDisplayValue("ALL")[0];
    fireEvent.change(logicSelect, { target: { value: "or" } });

    expect(screen.getAllByDisplayValue("ANY").length).toBeGreaterThan(0);
  });

  it("adds and removes conditions", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    await screen.findByPlaceholderText("event_name");
    fireEvent.click(screen.getByText("+ Add condition"));
    await waitFor(() => expect(screen.getAllByPlaceholderText("event_name").length).toBe(2));

    fireEvent.click(screen.getAllByText("Remove")[0]);
    await waitFor(() => expect(screen.getAllByPlaceholderText("event_name").length).toBe(1));
  });

  it("changing a condition's type swaps the fields shown", async () => {
    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    await screen.findByPlaceholderText("event_name");
    fireEvent.change(screen.getByDisplayValue("Event"), { target: { value: "user_property" } });

    expect(await screen.findByPlaceholderText("property name")).toBeInTheDocument();
  });

  it("saves a new segment with the built definition", async () => {
    mockedSegmentsApi.previewSegment.mockResolvedValue({ audienceCount: 5 });
    mockedSegmentsApi.createSegment.mockResolvedValue({
      id: "seg_new",
      siteId: "site_1",
      name: "Started checkout",
      description: null,
      definition: { logic: "and", conditions: [{ type: "event", eventName: "checkout_started", operator: "performed" }] },
      audienceCount: 5,
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
    });

    render(
      <MemoryRouter>
        <SegmentBuilderPage />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByPlaceholderText("High-intent trial users"), { target: { value: "Started checkout" } });
    fireEvent.change(screen.getByPlaceholderText("event_name"), { target: { value: "checkout_started" } });

    fireEvent.click(screen.getByText("Save segment"));

    await waitFor(() =>
      expect(mockedSegmentsApi.createSegment).toHaveBeenCalledWith(
        "org_1",
        "site_1",
        expect.objectContaining({
          name: "Started checkout",
          definition: { logic: "and", conditions: [{ type: "event", eventName: "checkout_started", operator: "performed" }] },
        })
      )
    );
  });

  it("loads an existing segment when editing", async () => {
    mockedSegmentsApi.getSegment.mockResolvedValue({
      id: "seg_1",
      siteId: "site_1",
      name: "Existing segment",
      description: "A saved segment",
      definition: { logic: "and", conditions: [{ type: "event", eventName: "demo_requested", operator: "performed" }] },
      audienceCount: 10,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/segments/seg_1/edit"]}>
        <Routes>
          <Route path="/segments/:segmentId/edit" element={<SegmentBuilderPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue("Existing segment")).toBeInTheDocument();
    expect(screen.getByDisplayValue("demo_requested")).toBeInTheDocument();
  });
});

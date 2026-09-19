import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { FunnelBuilderPage } from "./FunnelBuilderPage";
import * as funnelsApi from "../../api/funnels";
import * as eventsApi from "../../api/events";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/funnels");
vi.mock("../../api/events");
vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

const mockedFunnelsApi = vi.mocked(funnelsApi);
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

describe("FunnelBuilderPage", () => {
  it("starts with two empty event steps", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Create funnel")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Search events…")).toHaveLength(2);
  });

  it("adds a step with '+ Add step'", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    await screen.findByText("Steps");
    fireEvent.click(screen.getByText("+ Add step"));

    await waitFor(() => expect(screen.getAllByPlaceholderText("Search events…")).toHaveLength(3));
  });

  it("removes a step", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    await screen.findByText("Steps");
    fireEvent.click(screen.getAllByText("Remove")[0]);

    await waitFor(() => expect(screen.getAllByPlaceholderText("Search events…")).toHaveLength(1));
  });

  it("cannot remove the last remaining step", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    await screen.findByText("Steps");
    fireEvent.click(screen.getAllByText("Remove")[0]);
    await waitFor(() => expect(screen.getAllByPlaceholderText("Search events…")).toHaveLength(1));

    expect(screen.getByText("Remove")).toBeDisabled();
  });

  it("reorders steps with the up/down controls", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    const inputs = await screen.findAllByPlaceholderText("Search events…");
    fireEvent.change(inputs[0], { target: { value: "first_event" } });
    fireEvent.change(inputs[1], { target: { value: "second_event" } });

    fireEvent.click(screen.getAllByLabelText(/move step 2 up/i)[0]);

    const reordered = screen.getAllByPlaceholderText("Search events…");
    expect((reordered[0] as HTMLInputElement).value).toBe("second_event");
    expect((reordered[1] as HTMLInputElement).value).toBe("first_event");
  });

  it("switching a step's type to Page shows the page dropdown", async () => {
    mockedPagesApi.listPages.mockResolvedValue({ pages: [{ id: "pg_1", siteId: "site_1", name: "Pricing", rules: [], createdAt: "", updatedAt: "" } as any] });

    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    await screen.findByText("Steps");
    fireEvent.change(screen.getAllByDisplayValue("Event")[0], { target: { value: "page" } });

    expect(await screen.findByText("Select a page…")).toBeInTheDocument();
  });

  it("disables Save until every step has an event or page selected", async () => {
    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    await screen.findByText("Steps");
    fireEvent.change(screen.getByPlaceholderText("Signup Activation"), { target: { value: "My funnel" } });
    expect(screen.getByText("Save funnel")).toBeDisabled();
  });

  it("saves a new funnel with the built step list", async () => {
    mockedFunnelsApi.createFunnel.mockResolvedValue({
      id: "fun_new",
      siteId: "site_1",
      name: "Signup Activation",
      description: null,
      steps: [{ type: "event", eventName: "signup_started" }, { type: "event", eventName: "signup_completed" }],
      conversionWindowMinutes: 1440,
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
    });

    render(
      <MemoryRouter>
        <FunnelBuilderPage />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByPlaceholderText("Signup Activation"), { target: { value: "Signup Activation" } });
    const inputs = screen.getAllByPlaceholderText("Search events…");
    fireEvent.change(inputs[0], { target: { value: "signup_started" } });
    fireEvent.change(inputs[1], { target: { value: "signup_completed" } });

    fireEvent.click(screen.getByText("Save funnel"));

    await waitFor(() =>
      expect(mockedFunnelsApi.createFunnel).toHaveBeenCalledWith(
        "org_1",
        "site_1",
        expect.objectContaining({
          name: "Signup Activation",
          steps: [{ type: "event", eventName: "signup_started" }, { type: "event", eventName: "signup_completed" }],
        })
      )
    );
  });

  it("loads an existing funnel when editing", async () => {
    mockedFunnelsApi.getFunnel.mockResolvedValue({
      id: "fun_1",
      siteId: "site_1",
      name: "Existing funnel",
      description: "A saved funnel",
      steps: [{ type: "event", eventName: "workspace_created" }],
      conversionWindowMinutes: 60,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/observe/funnels/fun_1/edit"]}>
        <Routes>
          <Route path="/observe/funnels/:funnelId/edit" element={<FunnelBuilderPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue("Existing funnel")).toBeInTheDocument();
    expect(screen.getByDisplayValue("workspace_created")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1 hour")).toBeInTheDocument();
  });
});

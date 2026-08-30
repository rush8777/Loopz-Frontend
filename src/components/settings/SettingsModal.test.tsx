import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as sitesApi from "../../api/sites";
import * as auth from "../../auth/AuthContext";
import * as workspace from "../../auth/WorkspaceContext";
import { AppShell } from "../AppShell";

vi.mock("../../api/sites");
vi.mock("../../auth/AuthContext");
vi.mock("../../auth/WorkspaceContext");

const mockedSitesApi = vi.mocked(sitesApi);
const mockedAuth = vi.mocked(auth);
const mockedWorkspace = vi.mocked(workspace);

const setCurrentOrgId = vi.fn();
const setCurrentSiteId = vi.fn();
const refreshSites = vi.fn();
const logout = vi.fn();

const organizations = [
  { orgId: "org_1", name: "Acme", role: "OWNER" as const },
  { orgId: "org_2", name: "Orbit", role: "ADMIN" as const },
];
const sites = [
  { id: "internal_1", siteId: "site_public_1", name: "Acme Website", domain: "acme.test" },
  { id: "internal_2", siteId: "site_public_2", name: "Docs", domain: "docs.acme.test" },
];

function CurrentRoute() {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/observe/events"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/observe/events" element={<CurrentRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function openSettings() {
  renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
}

describe("Settings modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mockedAuth.useAuth.mockReturnValue({
      user: { id: "user_1", email: "owner@acme.test", name: "Owner" },
      bootstrapping: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout,
    });
    mockedWorkspace.useWorkspace.mockReturnValue({
      orgs: organizations,
      currentOrg: organizations[0],
      setCurrentOrgId,
      sites,
      currentSite: sites[0],
      setCurrentSiteId,
      loading: false,
      error: null,
      refreshSites,
    });
  });

  it("opens from the sidebar without changing the current route or rendering a TopBar", () => {
    renderApp();
    expect(screen.queryByText("owner@acme.test")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/observe/events");
    expect(screen.getByText("Acme Website")).toBeInTheDocument();
  });

  it("closes with the X button", () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape", () => {
    openSettings();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the backdrop but not from a click inside", () => {
    const dialog = openSettings();
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates between all settings sections", () => {
    openSettings();
    for (const section of ["Sites", "Installation", "Data & Privacy", "Developer", "Account"]) {
      fireEvent.click(screen.getByRole("button", { name: section }));
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }
  });

  it("switches sites and creates a new site using the workspace state", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Sites" }));
    fireEvent.click(screen.getByRole("button", { name: /Docs/ }));
    expect(setCurrentSiteId).toHaveBeenCalledWith("internal_2");

    mockedSitesApi.createSite.mockResolvedValue({ id: "internal_3", siteId: "site_public_3", name: "Blog", domain: null });
    refreshSites.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "+ Add site" }));
    fireEvent.change(screen.getByPlaceholderText("My website"), { target: { value: "Blog" } });
    fireEvent.click(screen.getByRole("button", { name: "Create site" }));

    await waitFor(() => expect(mockedSitesApi.createSite).toHaveBeenCalledWith("org_1", { name: "Blog" }));
    expect(refreshSites).toHaveBeenCalled();
    expect(setCurrentSiteId).toHaveBeenCalledWith("internal_3");
  });

  it("shows installation guidance and copies the public Site ID", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Installation" }));
    expect(screen.getByText(/npm install loopz/)).toBeInTheDocument();
    expect(screen.getByText(/createAnalytics/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Site ID" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("site_public_1"));
    expect(screen.getByRole("button", { name: "Copy Site ID" })).toHaveTextContent("Copied");
  });

  it("shows account details, switches organizations, and signs out", () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("owner@acme.test")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Organization" }), { target: { value: "org_2" } });
    expect(setCurrentOrgId).toHaveBeenCalledWith("org_2");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalled();
  });
});

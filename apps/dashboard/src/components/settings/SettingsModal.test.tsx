import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as organizationsApi from "../../api/organizations";
import * as sitesApi from "../../api/sites";
import * as teamApi from "../../api/team";
import * as auth from "../../auth/AuthContext";
import * as workspace from "../../auth/WorkspaceContext";
import { AppShell } from "../AppShell";

vi.mock("../../api/organizations");
vi.mock("../../api/sites");
vi.mock("../../api/team");
vi.mock("../../auth/AuthContext");
vi.mock("../../auth/WorkspaceContext");

const mockedOrganizationsApi = vi.mocked(organizationsApi);
const mockedSitesApi = vi.mocked(sitesApi);
const mockedTeamApi = vi.mocked(teamApi);
const mockedAuth = vi.mocked(auth);
const mockedWorkspace = vi.mocked(workspace);

const setCurrentOrgId = vi.fn();
const setCurrentSiteId = vi.fn();
const refreshOrgs = vi.fn();
const refreshSites = vi.fn();
const logout = vi.fn();
const organizations = [
  { orgId: "org_1", name: "Acme", role: "OWNER" as const },
  { orgId: "org_2", name: "Orbit", role: "ADMIN" as const },
];
const sites = [
  { id: "internal_1", siteId: "site_public_1", name: "Acme Website", domain: "https://acme.test" },
  { id: "internal_2", siteId: "site_public_2", name: "Docs", domain: "https://docs.acme.test" },
];
const members = [
  { userId: "user_1", name: "Owner", email: "owner@acme.test", role: "OWNER" as const, joinedAt: "2026-01-01T00:00:00.000Z" },
  { userId: "user_2", name: "Sarah", email: "sarah@acme.test", role: "ADMIN" as const, joinedAt: "2026-01-02T00:00:00.000Z" },
  { userId: "user_3", name: "Mina", email: "mina@acme.test", role: "MEMBER" as const, joinedAt: "2026-01-03T00:00:00.000Z" },
];
const pending = { id: "invite_1", email: "pending@acme.test", role: "MEMBER" as const, status: "pending" as const, createdAt: "2026-09-20T00:00:00.000Z", expiresAt: "2026-09-30T00:00:00.000Z" };

function CurrentRoute() {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
}

function renderApp() {
  return render(<MemoryRouter initialEntries={["/observe/events"]}><Routes><Route element={<AppShell />}><Route path="/observe/events" element={<CurrentRoute />} /></Route></Routes></MemoryRouter>);
}

function openSettings() {
  renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
}

async function openTeam() {
  openSettings();
  fireEvent.click(screen.getByRole("button", { name: "Team" }));
  await screen.findByText("Sarah");
}

describe("Settings modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    mockedAuth.useAuth.mockReturnValue({ user: { id: "user_1", email: "owner@acme.test", name: "Owner" }, bootstrapping: false, login: vi.fn(), signup: vi.fn(), signupFromInvitation: vi.fn(), logout });
    mockedWorkspace.useWorkspace.mockReturnValue({ orgs: organizations, currentOrg: organizations[0], setCurrentOrgId, sites, currentSite: sites[0], setCurrentSiteId, loading: false, error: null, refreshOrgs, refreshSites });
    mockedTeamApi.listMembers.mockResolvedValue({ members });
    mockedTeamApi.listInvitations.mockResolvedValue({ invitations: [pending] });
    mockedSitesApi.getSiteStatus.mockResolvedValue({ hasReceivedEvents: false, lastEventAt: null, siteId: "site_public_1", domain: "https://acme.test" });
  });

  it("opens on Workspace without changing the route and navigates through every section", async () => {
    openSettings();
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/observe/events");
    for (const section of ["Sites", "Team", "Installation", "Data & Privacy", "Developer", "Account"]) {
      fireEvent.click(screen.getByRole("button", { name: section }));
      expect(await screen.findByRole("heading", { name: section })).toBeInTheDocument();
    }
  });

  it("closes with the close button, Escape, and the backdrop", () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
    openSettings();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
    const dialog = openSettings();
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("updates the workspace name and refreshes organizations", async () => {
    mockedOrganizationsApi.updateOrganization.mockResolvedValue({ orgId: "org_1", name: "Acme Labs", role: "OWNER" });
    openSettings();
    fireEvent.change(screen.getByLabelText("Workspace name"), { target: { value: "Acme Labs" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mockedOrganizationsApi.updateOrganization).toHaveBeenCalledWith("org_1", { name: "Acme Labs" }));
    expect(refreshOrgs).toHaveBeenCalled();
  });

  it("switches sites, creates a site, and exposes selected site details", async () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Sites" }));
    fireEvent.click(screen.getByRole("button", { name: /Docs/ }));
    expect(setCurrentSiteId).toHaveBeenCalledWith("internal_2");
    expect(screen.getByText("site_public_1")).toBeInTheDocument();
    mockedSitesApi.createSite.mockResolvedValue({ id: "internal_3", siteId: "site_public_3", name: "Blog", domain: null });
    fireEvent.click(screen.getByRole("button", { name: "+ Add site" }));
    fireEvent.change(screen.getByPlaceholderText("My website"), { target: { value: "Blog" } });
    fireEvent.click(screen.getByRole("button", { name: "Create site" }));
    await waitFor(() => expect(mockedSitesApi.createSite).toHaveBeenCalledWith("org_1", { name: "Blog" }));
    expect(refreshSites).toHaveBeenCalled();
  });

  it("keeps the selected site read-only until Rename is clicked", async () => {
    mockedSitesApi.updateSite.mockResolvedValue({
      ...sites[0],
      name: "Acme Product",
      domain: "https://product.acme.test",
    });
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Sites" }));

    expect(screen.queryByLabelText("Site name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Site name"), { target: { value: "Acme Product" } });
    fireEvent.change(screen.getByLabelText("Primary domain"), { target: { value: "https://product.acme.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedSitesApi.updateSite).toHaveBeenCalledWith("org_1", "internal_1", {
      name: "Acme Product",
      domain: "https://product.acme.test",
    }));
    expect(refreshSites).toHaveBeenCalled();
  });

  it("requires the exact site name before deleting and selects a remaining site", async () => {
    mockedSitesApi.deleteSite.mockResolvedValue(undefined);
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Sites" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete site…" }));

    const deleteDialog = screen.getByRole("dialog", { name: "Delete Acme Website?" });
    const confirmButton = within(deleteDialog).getByRole("button", { name: "Delete site" });
    const confirmation = within(deleteDialog).getByLabelText("Type Acme Website to confirm");
    expect(confirmButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "Acme" } });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "Acme Website" } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockedSitesApi.deleteSite).toHaveBeenCalledWith("org_1", "internal_1"));
    expect(setCurrentSiteId).toHaveBeenCalledWith("internal_2");
    expect(refreshSites).toHaveBeenCalled();
  });

  it("loads members, marks the current user, locks the owner, and shows pending invitations", async () => {
    await openTeam();
    expect(mockedTeamApi.listMembers).toHaveBeenCalledWith("org_1");
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("pending@acme.test")).toBeInTheDocument();
    expect(screen.queryByLabelText("Role for owner@acme.test")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Remove owner@acme.test")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite member" })).toBeInTheDocument();
  });

  it("hides Team management actions from MEMBER and VIEWER roles", async () => {
    for (const role of ["MEMBER", "VIEWER"] as const) {
      mockedWorkspace.useWorkspace.mockReturnValue({ orgs: [{ ...organizations[0], role }], currentOrg: { ...organizations[0], role }, setCurrentOrgId, sites, currentSite: sites[0], setCurrentSiteId, loading: false, error: null, refreshOrgs, refreshSites });
      const view = renderApp();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      fireEvent.click(screen.getByRole("button", { name: "Team" }));
      await screen.findByText("Sarah");
      expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Role for sarah@acme.test")).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("shows Team management actions to an ADMIN", async () => {
    const adminOrg = { ...organizations[0], role: "ADMIN" as const };
    mockedWorkspace.useWorkspace.mockReturnValue({ orgs: [adminOrg], currentOrg: adminOrg, setCurrentOrgId, sites, currentSite: sites[0], setCurrentSiteId, loading: false, error: null, refreshOrgs, refreshSites });
    await openTeam();
    expect(screen.getByRole("button", { name: "Invite member" })).toBeInTheDocument();
    expect(mockedTeamApi.listInvitations).toHaveBeenCalledWith("org_1");
  });

  it("creates an invitation and makes its one-time link copyable", async () => {
    mockedTeamApi.createInvitation.mockResolvedValue({ invitation: { ...pending, id: "invite_2", email: "new@acme.test" }, inviteUrl: "https://dashboard.movecues.com/invite/raw-token" });
    await openTeam();
    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));
    const inviteDialog = screen.getByRole("dialog", { name: "Invite member" });
    expect(within(inviteDialog).getByRole("button", { name: "Create invitation" })).toBeDisabled();
    fireEvent.change(within(inviteDialog).getByLabelText("Email address"), { target: { value: "not-an-email" } });
    fireEvent.click(within(inviteDialog).getByRole("button", { name: "Create invitation" }));
    expect(mockedTeamApi.createInvitation).not.toHaveBeenCalled();
    fireEvent.change(within(inviteDialog).getByLabelText("Email address"), { target: { value: "new@acme.test" } });
    fireEvent.click(within(inviteDialog).getByRole("button", { name: "Create invitation" }));
    expect(await screen.findByRole("heading", { name: "Invitation created" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://dashboard.movecues.com/invite/raw-token"));
  });

  it("changes roles, revokes invitations, and removes members with confirmation", async () => {
    mockedTeamApi.updateMemberRole.mockResolvedValue({ userId: "user_2", role: "VIEWER" });
    mockedTeamApi.revokeInvitation.mockResolvedValue(undefined);
    mockedTeamApi.removeMember.mockResolvedValue(undefined);
    await openTeam();
    fireEvent.change(screen.getByLabelText("Role for sarah@acme.test"), { target: { value: "VIEWER" } });
    await waitFor(() => expect(mockedTeamApi.updateMemberRole).toHaveBeenCalledWith("org_1", "user_2", "VIEWER"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(mockedTeamApi.revokeInvitation).toHaveBeenCalledWith("org_1", "invite_1"));
    fireEvent.click(screen.getByRole("button", { name: "Remove mina@acme.test" }));
    await waitFor(() => expect(mockedTeamApi.removeMember).toHaveBeenCalledWith("org_1", "user_3"));
    expect(window.confirm).toHaveBeenCalled();
  });

  it("shows evidence-based installation status and copies the public Site ID", async () => {
    mockedSitesApi.getSiteStatus.mockResolvedValue({ hasReceivedEvents: true, lastEventAt: new Date().toISOString(), siteId: "site_public_1", domain: "https://acme.test" });
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Installation" }));
    expect(await screen.findByText("Receiving data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Site ID" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("site_public_1"));
  });

  it("shows a live SDK timeout without changing historical event status", async () => {
    mockedSitesApi.getSiteStatus.mockResolvedValue({
      hasReceivedEvents: true,
      lastEventAt: new Date().toISOString(),
      siteId: "site_public_1",
      domain: "https://acme.test",
    });
    mockedSitesApi.createSdkVerification.mockResolvedValue({
      verification: { id: "sdkv_timeout", status: "pending", expiresAt: new Date(Date.now() + 30_000).toISOString(), detectedAt: null },
    });
    mockedSitesApi.getSdkVerification.mockResolvedValue({
      verification: { id: "sdkv_timeout", status: "expired", expiresAt: new Date().toISOString(), detectedAt: null },
    });

    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Installation" }));
    expect(await screen.findByText("Receiving data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test SDK connection" }));

    expect(await screen.findByText("SDK not detected")).toBeInTheDocument();
    expect(screen.getByText("Open or refresh https://acme.test and try again.")).toBeInTheDocument();
    expect(screen.getByText("Receiving data")).toBeInTheDocument();
    expect(mockedSitesApi.getSdkVerification).toHaveBeenCalledWith("org_1", "internal_1", "sdkv_timeout");
  });

  it("shows the connected indicator only after backend polling reports acknowledgement", async () => {
    mockedSitesApi.createSdkVerification.mockResolvedValue({
      verification: { id: "sdkv_connected", status: "pending", expiresAt: new Date(Date.now() + 30_000).toISOString(), detectedAt: null },
    });
    mockedSitesApi.getSdkVerification.mockResolvedValue({
      verification: { id: "sdkv_connected", status: "connected", expiresAt: new Date(Date.now() + 30_000).toISOString(), detectedAt: new Date().toISOString() },
    });

    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Installation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Test SDK connection" }));

    expect(await screen.findByText("SDK connected")).toBeInTheDocument();
    expect(screen.getByText("Detected just now")).toBeInTheDocument();
    expect(screen.getByLabelText("Connected")).toBeInTheDocument();
  });

  it("keeps Account personal and signs out", () => {
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("owner@acme.test")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Organization" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalled();
  });
});

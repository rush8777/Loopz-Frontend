import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as teamApi from "../../api/team";
import * as auth from "../../auth/AuthContext";
import * as workspace from "../../auth/WorkspaceContext";
import { InvitationPage } from "./InvitationPage";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";

vi.mock("../../api/team");
vi.mock("../../auth/AuthContext");
vi.mock("../../auth/WorkspaceContext");

const mockedTeamApi = vi.mocked(teamApi);
const mockedAuth = vi.mocked(auth);
const mockedWorkspace = vi.mocked(workspace);
const refreshOrgs = vi.fn();
const setCurrentOrgId = vi.fn();
const logout = vi.fn();
const signupFromInvitation = vi.fn();
const login = vi.fn();
const signup = vi.fn();
const invitation = { organization: { id: "org_1", name: "Acme" }, email: "person@example.com", role: "MEMBER" as const, expiresAt: "2026-10-01T00:00:00.000Z" };

function authValue(user: { id: string; email: string; name: string | null } | null = null) {
  return { user, bootstrapping: false, login, signup, signupFromInvitation, logout };
}

function renderInvitation() {
  return render(<MemoryRouter initialEntries={["/invite/raw-token"]}><Routes><Route path="/invite/:token" element={<InvitationPage />} /><Route path="/" element={<p>Dashboard destination</p>} /></Routes></MemoryRouter>);
}

describe("InvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.useAuth.mockReturnValue(authValue());
    mockedWorkspace.useWorkspace.mockReturnValue({ orgs: [], currentOrg: null, setCurrentOrgId, sites: [], currentSite: null, setCurrentSiteId: vi.fn(), loading: false, error: null, refreshOrgs, refreshSites: vi.fn() });
    mockedTeamApi.getInvitation.mockResolvedValue(invitation);
  });

  it("renders a valid invitation and its two unauthenticated paths", async () => {
    renderInvitation();
    expect(await screen.findByRole("heading", { name: "You've been invited to Acme" })).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("button", { name: "Create account and join" })).toBeInTheDocument();
  });

  it("renders a safe error for an invalid or expired invitation", async () => {
    mockedTeamApi.getInvitation.mockRejectedValue(new Error("invalid"));
    renderInvitation();
    expect(await screen.findByRole("heading", { name: "Invitation unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/invalid, expired, revoked, or has already been used/i)).toBeInTheDocument();
  });

  it("lets the matching signed-in user accept, refresh, and select the joined workspace", async () => {
    mockedAuth.useAuth.mockReturnValue(authValue({ id: "user_1", email: "person@example.com", name: "Person" }));
    mockedTeamApi.acceptInvitation.mockResolvedValue({ membership: { orgId: "org_1", userId: "user_1", role: "MEMBER" } });
    renderInvitation();
    fireEvent.click(await screen.findByRole("button", { name: "Join workspace" }));
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
    expect(refreshOrgs).toHaveBeenCalled();
    expect(setCurrentOrgId).toHaveBeenCalledWith("org_1");
  });

  it("explains a wrong signed-in account and allows switching", async () => {
    mockedAuth.useAuth.mockReturnValue(authValue({ id: "wrong", email: "wrong@example.com", name: "Wrong" }));
    renderInvitation();
    expect(await screen.findByText(/signed in as wrong@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/belongs to person@example.com/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out and switch account" }));
    expect(logout).toHaveBeenCalled();
  });

  it("creates an invited account without asking for an organization name", async () => {
    signupFromInvitation.mockResolvedValue({ orgId: "org_1" });
    renderInvitation();
    fireEvent.click(await screen.findByRole("button", { name: "Create account and join" }));
    expect(screen.queryByLabelText("Organization name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-battery-staple" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account and join" }));
    await waitFor(() => expect(signupFromInvitation).toHaveBeenCalledWith("raw-token", { name: "Alex", password: "correct-horse-battery-staple" }));
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
  });

  it("keeps organization name on normal signup", () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    expect(screen.getByLabelText("Organization name")).toBeRequired();
  });

  it("returns to the invitation after sign in", async () => {
    login.mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={[{ pathname: "/login", state: { returnTo: "/invite/raw-token" } }]}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/invite/:token" element={<p>Returned to invitation</p>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-battery-staple" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Returned to invitation")).toBeInTheDocument();
  });
});

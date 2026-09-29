import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import * as auth from "../../auth/AuthContext";
import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";

vi.mock("../../auth/AuthContext");
vi.mock("../../components/auth/GoogleAuthButton", () => ({
  isGoogleAuthConfigured: true,
  GoogleAuthButton: ({ onCredential, disabled }: { onCredential: (credential: string) => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={() => onCredential("google-credential")}>Continue with Google</button>
  ),
}));

const mockedAuth = vi.mocked(auth);
const googleLogin = vi.fn();

function authValue() {
  return {
    user: null,
    bootstrapping: false,
    login: vi.fn(),
    signup: vi.fn(),
    googleLogin,
    signupFromInvitation: vi.fn(),
    logout: vi.fn(),
  };
}

describe("Google authentication pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.useAuth.mockReturnValue(authValue());
  });

  it("preserves the invitation returnTo after successful Google login", async () => {
    googleLogin.mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={[{ pathname: "/login", state: { returnTo: "/invite/raw-token" } }]}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/invite/:token" element={<p>Invitation destination</p>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Invitation destination")).toBeInTheDocument();
    expect(googleLogin).toHaveBeenCalledWith("google-credential");
  });

  it("shows the signup path without authenticating a new Google user on login", async () => {
    googleLogin.mockRejectedValue(new ApiError(409, { error: "google_signup_required" }));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("No Movecues account exists for this Google account yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Create an account" }).some((link) => link.getAttribute("href") === "/signup")).toBe(true);
    expect(googleLogin).toHaveBeenCalledTimes(1);
  });

  it("keeps the credential in component state and completes Google signup with the organization name", async () => {
    googleLogin.mockRejectedValueOnce(new ApiError(409, { error: "google_signup_required" })).mockResolvedValueOnce(undefined);
    render(<MemoryRouter initialEntries={["/signup"]}><Routes><Route path="/signup" element={<SignupPage />} /><Route path="/" element={<p>Dashboard destination</p>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Enter an organization name to finish creating your workspace.")).toBeInTheDocument();
    expect(googleLogin).toHaveBeenNthCalledWith(1, "google-credential");
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace with Google" }));
    await waitFor(() => expect(googleLogin).toHaveBeenNthCalledWith(2, "google-credential", "Acme"));
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
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

  it("shows a Google verification error without changing the login route", async () => {
    googleLogin.mockRejectedValue(new ApiError(401, { error: "invalid_google_credential" }));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Google sign-in couldn't be verified. Please try again.")).toBeInTheDocument();
    expect(googleLogin).toHaveBeenCalledTimes(1);
  });

  it("continues directly after Google account creation", async () => {
    googleLogin.mockResolvedValueOnce(undefined);
    render(<MemoryRouter initialEntries={["/signup"]}><Routes><Route path="/signup" element={<SignupPage />} /><Route path="/" element={<p>Dashboard destination</p>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(googleLogin).toHaveBeenCalledWith("google-credential");
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
  });
});

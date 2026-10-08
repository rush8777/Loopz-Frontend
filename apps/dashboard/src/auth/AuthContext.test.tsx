import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../api/auth";
import * as client from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/auth");
vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, setAccessToken: vi.fn(), setRefreshToken: vi.fn() };
});

function Consumer() {
  const { user, googleLogin } = useAuth();
  return <><span>{user?.email ?? "signed out"}</span><button onClick={() => void googleLogin("credential").catch(() => undefined)}>Google</button></>;
}

describe("AuthContext Google session", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stores the standard movcues token pair and updates the user", async () => {
    vi.mocked(authApi.googleLogin).mockResolvedValue({
      user: { id: "usr_1", email: "person@example.com", name: "Person" },
      accessToken: "access",
      refreshToken: "refresh",
    });
    render(<AuthProvider><Consumer /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    expect(await screen.findByText("person@example.com")).toBeInTheDocument();
    expect(authApi.googleLogin).toHaveBeenCalledWith("credential");
    expect(client.setAccessToken).toHaveBeenCalledWith("access");
    expect(client.setRefreshToken).toHaveBeenCalledWith("refresh");
  });

  it("does not authenticate when Google verification fails", async () => {
    vi.mocked(authApi.googleLogin).mockRejectedValue(new client.ApiError(401, { error: "invalid_google_credential" }));
    render(<AuthProvider><Consumer /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    await waitFor(() => expect(authApi.googleLogin).toHaveBeenCalled());
    expect(screen.getByText("signed out")).toBeInTheDocument();
    expect(client.setAccessToken).not.toHaveBeenCalled();
    expect(client.setRefreshToken).not.toHaveBeenCalled();
  });
});

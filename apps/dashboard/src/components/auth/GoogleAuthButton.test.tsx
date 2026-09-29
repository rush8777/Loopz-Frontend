import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("GoogleAuthButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.google;
    document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]').forEach((script) => script.remove());
    vi.resetModules();
  });

  it("initializes GIS once, renders Google's button, and delivers its credential", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "browser-client-id");
    let callback: ((response: GoogleCredentialResponse) => void) | undefined;
    const initialize = vi.fn((config: { callback: (response: GoogleCredentialResponse) => void }) => { callback = config.callback; });
    const renderButton = vi.fn((parent: HTMLElement) => {
      const button = document.createElement("button");
      button.textContent = "Continue with Google";
      parent.appendChild(button);
    });
    window.google = { accounts: { id: { initialize, renderButton } } };
    const onCredential = vi.fn();
    const { GoogleAuthButton } = await import("./GoogleAuthButton");
    render(<GoogleAuthButton onCredential={onCredential} />);
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledTimes(1);
    act(() => callback?.({ credential: "google-id-token" }));
    expect(onCredential).toHaveBeenCalledWith("google-id-token");
  });

  it("renders nothing and does not load a script when the client ID is missing", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { GoogleAuthButton } = await import("./GoogleAuthButton");
    const { container } = render(<GoogleAuthButton onCredential={vi.fn()} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(document.querySelector('script[src="https://accounts.google.com/gsi/client"]')).toBeNull();
  });
});

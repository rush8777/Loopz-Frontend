import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Paddle initialization", () => {
  beforeEach(() => { vi.resetModules(); delete window.Paddle; });
  afterEach(() => { vi.unstubAllEnvs(); delete window.Paddle; document.head.querySelectorAll('script[src*="cdn.paddle.com"]').forEach(script => script.remove()); });

  function provider() {
    const paddle = { Environment: { set: vi.fn() }, Initialize: vi.fn(), Checkout: { open: vi.fn() } };
    window.Paddle = paddle;
    return paddle;
  }

  it.each([["test_example", "sandbox"], ["live_example", "production"]])("selects %s's environment before initializing", async (token, environment) => {
    vi.stubEnv("VITE_PADDLE_CLIENT_TOKEN", token);
    const paddle = provider();
    const { initializePaddleCheckout, openPaddleCheckout } = await import("./paddleCheckout");
    await Promise.all([initializePaddleCheckout(), initializePaddleCheckout()]);
    expect(paddle.Environment.set).toHaveBeenCalledWith(environment);
    expect(paddle.Initialize).toHaveBeenCalledExactlyOnceWith({ token });
    expect(paddle.Environment.set.mock.invocationCallOrder[0]).toBeLessThan(paddle.Initialize.mock.invocationCallOrder[0]);
    expect(paddle.Checkout.open).not.toHaveBeenCalled();
    await openPaddleCheckout("txn_example");
    expect(paddle.Initialize).toHaveBeenCalledTimes(1);
    expect(paddle.Checkout.open).toHaveBeenCalledWith({ transactionId: "txn_example", settings: { displayMode: "overlay", theme: "light" } });
  });

  it("does not load Paddle when the client token is missing", async () => {
    vi.stubEnv("VITE_PADDLE_CLIENT_TOKEN", "");
    const { initializePaddleCheckout } = await import("./paddleCheckout");
    await expect(initializePaddleCheckout()).rejects.toThrow("not configured");
    expect(document.head.querySelector('script[src*="cdn.paddle.com"]')).toBeNull();
  });

  it("allows a failed script download to be retried", async () => {
    vi.stubEnv("VITE_PADDLE_CLIENT_TOKEN", "test_example");
    const { initializePaddleCheckout } = await import("./paddleCheckout");
    const first = initializePaddleCheckout();
    const rejection = expect(first).rejects.toThrow("could not be loaded");
    document.head.querySelector('script[src*="cdn.paddle.com"]')!.dispatchEvent(new Event("error"));
    await rejection;
    const retry = initializePaddleCheckout();
    const script = document.head.querySelector('script[src*="cdn.paddle.com"]')!;
    const paddle = provider();
    script.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe(paddle);
  });
});

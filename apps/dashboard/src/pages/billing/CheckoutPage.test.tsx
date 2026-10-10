import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutPage } from "./CheckoutPage";

const { initialize } = vi.hoisted(() => ({ initialize: vi.fn() }));
vi.mock("../../lib/paddleCheckout", () => ({ initializePaddleCheckout: initialize }));

describe("public checkout page", () => {
  beforeEach(() => { initialize.mockReset(); initialize.mockResolvedValue({}); });
  function page(url: string) { render(<MemoryRouter initialEntries={[url]}><CheckoutPage /></MemoryRouter>); }

  it("initializes Paddle for a payment link without requiring an authenticated workspace", async () => {
    page("/checkout?_ptxn=txn_01234567890123456789012345");
    expect(await screen.findByText(/Use the secure Paddle checkout window/)).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Return to billing" })).toHaveAttribute("href", "/billing");
  });
  it("initializes the plain checkout destination and explains how to start", async () => {
    page("/checkout");
    expect(await screen.findByText(/Choose a plan from Billing/)).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledOnce();
  });
  it("shows invalid payment links without initializing a checkout", () => {
    page("/checkout?_ptxn=invalid");
    expect(screen.getByRole("alert")).toHaveTextContent("payment link is invalid");
    expect(initialize).not.toHaveBeenCalled();
  });
  it("shows a useful loading error and a retry action", async () => {
    initialize.mockRejectedValue(new Error("Paddle Checkout could not be loaded."));
    page("/checkout");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpgradeNowProvider } from "./UpgradeNowModal";
import * as billing from "../../api/billing";

vi.mock("../../auth/WorkspaceContext", () => ({ useWorkspace: () => ({ currentOrg: { orgId: "org_1", role: "OWNER" } }) }));
vi.mock("../../api/billing");

const mockedBilling = vi.mocked(billing);

describe("UpgradeNowProvider", () => {
  beforeEach(() => {
    mockedBilling.getPlanUsage.mockResolvedValue({
      subscription: { planId: "starter", planName: "Starter", status: "active", active: true, trialEndsAt: null, currentPeriodStartsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false },
      usage: { sites: 1, members: 1, dashboards: 0, segments: 0, funnels: 0, publishedExperiences: 0, monthlyActiveUsers: 0, monthlyActiveUsersBySite: [] },
      limits: { site: 1, member: 3, dashboard: 3, segment: 10, funnel: 3, published_experience: 5, monthlyActiveUsers: 5000 }, features: [], billingConfigured: false,
      monthlyActiveUsers: { current: 0, limit: 5000, percent: 0, state: "ok", softCap: true },
    });
  });

  it("opens a hovering upgrade wall for a resource-limit response", async () => {
    render(<UpgradeNowProvider><p>Workspace</p></UpgradeNowProvider>);
    fireEvent(window, new CustomEvent("movcues:upgrade-required", { detail: { error: "resource_limit", entitlement: { resource: "site", current: 1, limit: 1, planId: "starter" } } }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("You’ve reached your plan limit");
    expect(screen.getByRole("dialog")).toHaveTextContent("You’re using 1 of 1.");
    await waitFor(() => expect(mockedBilling.getPlanUsage).toHaveBeenCalledWith("org_1"));
  });
});

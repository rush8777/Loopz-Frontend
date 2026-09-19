import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardListPage } from "./DashboardListPage";
import * as dashboardsApi from "@/api/dashboards";
import * as workspace from "@/auth/WorkspaceContext";

vi.mock("@/api/dashboards"); vi.mock("@/auth/WorkspaceContext");
const api = vi.mocked(dashboardsApi), ws = vi.mocked(workspace);
function ready(role: "OWNER" | "VIEWER" = "OWNER", site = true) { ws.useWorkspace.mockReturnValue({ orgs: [], currentOrg: { orgId: "org_1", name: "Acme", role }, setCurrentOrgId: vi.fn(), sites: [], currentSite: site ? { id: "site_1", siteId: "public", name: "App", domain: null } : null, setCurrentSiteId: vi.fn(), loading: false, error: null, refreshSites: vi.fn() }); }
describe("DashboardListPage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("shows the no-site state", () => { ready("OWNER", false); render(<MemoryRouter><DashboardListPage /></MemoryRouter>); expect(screen.getByText("Select a site")).toBeInTheDocument(); });
  it("shows the empty dashboard state and create action for admins", async () => { ready(); api.listDashboards.mockResolvedValue({ dashboards: [] }); render(<MemoryRouter><DashboardListPage /></MemoryRouter>); expect(await screen.findByText("No dashboards yet")).toBeInTheDocument(); expect(screen.getAllByRole("button", { name: /create dashboard|new dashboard/i }).length).toBeGreaterThan(0); });
  it("hides mutations from viewers and retries errors", async () => { ready("VIEWER"); api.listDashboards.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ dashboards: [] }); render(<MemoryRouter><DashboardListPage /></MemoryRouter>); expect(await screen.findByText("offline")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /new dashboard/i })).not.toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Retry" })); await waitFor(() => expect(api.listDashboards).toHaveBeenCalledTimes(2)); });
});

import { apiRequest } from "./client";
import type { Dashboard, DashboardCard, DashboardSummary } from "../types/api";

export function listDashboards(orgId: string, siteId: string) { return apiRequest<{ dashboards: DashboardSummary[] }>(`/orgs/${orgId}/sites/${siteId}/dashboards`); }
export function getDashboard(orgId: string, siteId: string, dashboardId: string) { return apiRequest<Dashboard>(`/orgs/${orgId}/sites/${siteId}/dashboards/${dashboardId}`); }
export function createDashboard(orgId: string, siteId: string, input: { name: string; description?: string | null; cards?: DashboardCard[] }) { return apiRequest<Dashboard>(`/orgs/${orgId}/sites/${siteId}/dashboards`, { method: "POST", body: input }); }
export function updateDashboard(orgId: string, siteId: string, dashboardId: string, input: { name?: string; description?: string | null; cards?: DashboardCard[] }) { return apiRequest<Dashboard>(`/orgs/${orgId}/sites/${siteId}/dashboards/${dashboardId}`, { method: "PATCH", body: input }); }
export function deleteDashboard(orgId: string, siteId: string, dashboardId: string) { return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}/dashboards/${dashboardId}`, { method: "DELETE" }); }

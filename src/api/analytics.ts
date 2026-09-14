import { apiRequest } from "./client";
import type { AnalyticsCatalog, AnalyticsResponse, DashboardCardConfiguration, DashboardFilters } from "../types/api";

export function getCatalog(orgId: string, siteId: string) { return apiRequest<AnalyticsCatalog>(`/orgs/${orgId}/sites/${siteId}/analytics/catalog`); }
export function queryAnalytics(orgId: string, siteId: string, filters: DashboardFilters, query: DashboardCardConfiguration) { return apiRequest<AnalyticsResponse>(`/orgs/${orgId}/sites/${siteId}/analytics/query`, { method: "POST", body: { filters, query } }); }
export function queryAnalyticsBatch(orgId: string, siteId: string, filters: DashboardFilters, queries: { requestId: string; query: DashboardCardConfiguration }[]) { return apiRequest<{ results: ({ requestId: string; status: "ok" } & AnalyticsResponse | { requestId: string; status: "error"; error: string; message: string })[] }>(`/orgs/${orgId}/sites/${siteId}/analytics/query/batch`, { method: "POST", body: { filters, queries } }); }
export function drilldown(orgId: string, siteId: string, filters: DashboardFilters, query: DashboardCardConfiguration, selection: Record<string, unknown>) { return apiRequest<{ kind: string; items?: unknown[]; users?: unknown[]; total: number; limit: number; offset: number }>(`/orgs/${orgId}/sites/${siteId}/analytics/drilldown`, { method: "POST", body: { filters, query, selection } }); }

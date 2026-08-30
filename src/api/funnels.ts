import { apiRequest } from "./client";
import type { Funnel, FunnelAnalysis, FunnelListItem, FunnelStep, FunnelStepUser } from "../types/api";

export interface FunnelConversionWindow {
  value: number;
  unit: "hours" | "days";
}

export interface FunnelInput {
  name: string;
  description?: string;
  steps: FunnelStep[];
  conversionWindow?: FunnelConversionWindow;
}

export function listFunnels(orgId: string, siteId: string, opts: { search?: string; limit?: number; offset?: number } = {}) {
  return apiRequest<{ funnels: FunnelListItem[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/funnels`,
    { query: { search: opts.search, limit: opts.limit, offset: opts.offset } }
  );
}

export function getFunnel(orgId: string, siteId: string, funnelId: string) {
  return apiRequest<Funnel>(`/orgs/${orgId}/sites/${siteId}/funnels/${funnelId}`);
}

export function createFunnel(orgId: string, siteId: string, input: FunnelInput) {
  return apiRequest<Funnel>(`/orgs/${orgId}/sites/${siteId}/funnels`, { method: "POST", body: input });
}

export function updateFunnel(orgId: string, siteId: string, funnelId: string, input: Partial<FunnelInput>) {
  return apiRequest<Funnel>(`/orgs/${orgId}/sites/${siteId}/funnels/${funnelId}`, { method: "PATCH", body: input });
}

export function deleteFunnel(orgId: string, siteId: string, funnelId: string) {
  return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}/funnels/${funnelId}`, { method: "DELETE" });
}

/** Full conversion analysis for a saved funnel over a date range, optionally restricted to a saved Segment (task brief section 17) - analysis-time parameters, not saved on the funnel. */
export function analyzeFunnel(
  orgId: string,
  siteId: string,
  funnelId: string,
  range: { since: string; until: string },
  opts: { segmentId?: string } = {}
) {
  return apiRequest<FunnelAnalysis>(`/orgs/${orgId}/sites/${siteId}/funnels/${funnelId}/analyze`, {
    query: { since: range.since, until: range.until, segmentId: opts.segmentId },
  });
}

export function getFunnelStepUsers(
  orgId: string,
  siteId: string,
  funnelId: string,
  stepIndex: number,
  range: { since: string; until: string },
  opts: { segmentId?: string; limit?: number; offset?: number } = {}
) {
  return apiRequest<{ users: FunnelStepUser[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/funnels/${funnelId}/steps/${stepIndex}/users`,
    { query: { since: range.since, until: range.until, segmentId: opts.segmentId, limit: opts.limit, offset: opts.offset } }
  );
}

import { apiRequest } from "./client";
import type { Site, SiteStatus } from "../types/api";

export function listSites(orgId: string) {
  return apiRequest<{ sites: Site[] }>(`/orgs/${orgId}/sites`);
}

export function createSite(orgId: string, input: { name: string; domain?: string }) {
  return apiRequest<Site>(`/orgs/${orgId}/sites`, { method: "POST", body: input });
}

export function updateSite(orgId: string, siteId: string, input: { name?: string; domain?: string | null }) {
  return apiRequest<Site>(`/orgs/${orgId}/sites/${siteId}`, { method: "PATCH", body: input });
}

export function getSiteStatus(orgId: string, siteId: string) {
  return apiRequest<SiteStatus>(`/orgs/${orgId}/sites/${siteId}/status`);
}

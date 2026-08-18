import { apiRequest } from "./client";
import type { Site } from "../types/api";

export function listSites(orgId: string) {
  return apiRequest<{ sites: Site[] }>(`/orgs/${orgId}/sites`);
}

export function createSite(orgId: string, input: { name: string; domain?: string }) {
  return apiRequest<Site>(`/orgs/${orgId}/sites`, { method: "POST", body: input });
}

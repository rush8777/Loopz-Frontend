import { apiRequest } from "./client";
import type { GeoAgentCitation, GeoAgentConfig, GeoAgentMetrics } from "../types/geoAgent";

const base = (orgId: string, siteId: string, experienceId: string) =>
  `/orgs/${encodeURIComponent(orgId)}/sites/${encodeURIComponent(siteId)}/experiences/${encodeURIComponent(experienceId)}/geo-agent`;
export function previewGeoAgent(orgId: string, siteId: string, experienceId: string, config: GeoAgentConfig, question: string) {
  return apiRequest<{ message: string; citations: GeoAgentCitation[] }>(`${base(orgId, siteId, experienceId)}/preview`, { method: "POST", body: { config, question } });
}
export function getGeoAgentMetrics(orgId: string, siteId: string, experienceId: string) {
  return apiRequest<GeoAgentMetrics>(`${base(orgId, siteId, experienceId)}/metrics`);
}

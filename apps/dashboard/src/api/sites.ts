import { apiRequest } from "./client";
import type { SdkVerificationResponse, Site, SiteStatus } from "../types/api";

export function listSites(orgId: string) {
  return apiRequest<{ sites: Site[] }>(`/orgs/${orgId}/sites`);
}

export function createSite(orgId: string, input: { name: string; domain?: string }) {
  return apiRequest<Site>(`/orgs/${orgId}/sites`, { method: "POST", body: input });
}

export function updateSite(orgId: string, siteId: string, input: { name?: string; domain?: string | null }) {
  return apiRequest<Site>(`/orgs/${orgId}/sites/${siteId}`, { method: "PATCH", body: input });
}

export function deleteSite(orgId: string, siteId: string) {
  return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}`, { method: "DELETE" });
}

export function getSiteStatus(orgId: string, siteId: string) {
  return apiRequest<SiteStatus>(`/orgs/${orgId}/sites/${siteId}/status`);
}

export function createSdkVerification(orgId: string, siteId: string) {
  return apiRequest<SdkVerificationResponse>(`/orgs/${orgId}/sites/${siteId}/sdk-verifications`, { method: "POST" });
}

export function getSdkVerification(orgId: string, siteId: string, verificationId: string) {
  return apiRequest<SdkVerificationResponse>(
    `/orgs/${orgId}/sites/${siteId}/sdk-verifications/${encodeURIComponent(verificationId)}`
  );
}

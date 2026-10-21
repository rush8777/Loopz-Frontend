import { apiRequest } from "./client";
import type { SiteThemeResponse, SiteThemeTokens, ThemeCapture } from "../types/themes";

const root = (orgId: string, siteId: string) => `/orgs/${orgId}/sites/${siteId}`;
export const getSiteTheme = (orgId: string, siteId: string) => apiRequest<SiteThemeResponse>(`${root(orgId, siteId)}/theme`);
export const createThemeCapture = (orgId: string, siteId: string) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures`, { method: "POST" });
export const getThemeCapture = (orgId: string, siteId: string, captureId: string) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures/${encodeURIComponent(captureId)}`);
export const activateTheme = (orgId: string, siteId: string, captureId: string, tokens: SiteThemeTokens) => apiRequest<Pick<SiteThemeResponse, "active" | "candidate">>(`${root(orgId, siteId)}/theme`, { method: "PUT", body: { captureId, tokens } });
export const discardThemeCandidate = (orgId: string, siteId: string) => apiRequest<void>(`${root(orgId, siteId)}/theme-candidate`, { method: "DELETE" });

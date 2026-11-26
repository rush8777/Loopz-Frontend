import { apiRequest } from "./client";
import type { SavedTheme, SiteThemeResponse, SiteThemeTokens, ThemeCapture, ThemePreview, ThemeSelection } from "../types/themes";
import type { ExperienceTemplateSummary } from "./experiences";

const root = (orgId: string, siteId: string) => `/orgs/${orgId}/sites/${siteId}`;
export const getSiteTheme = (orgId: string, siteId: string) => apiRequest<SiteThemeResponse>(`${root(orgId, siteId)}/theme`);
export const createThemeCapture = (orgId: string, siteId: string) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures`, { method: "POST" });
export const getThemeCapture = (orgId: string, siteId: string, captureId: string) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures/${encodeURIComponent(captureId)}`);
export const activateTheme = (orgId: string, siteId: string, captureId: string, tokens: SiteThemeTokens) => apiRequest<Pick<SiteThemeResponse, "active" | "candidate">>(`${root(orgId, siteId)}/theme`, { method: "PUT", body: { captureId, tokens } });
export const discardThemeCandidate = (orgId: string, siteId: string) => apiRequest<void>(`${root(orgId, siteId)}/theme-candidate`, { method: "DELETE" });
export const listSavedThemes = (orgId: string, siteId: string) => apiRequest<{ presets: SavedTheme[] }>(`${root(orgId, siteId)}/style-presets`);
export const saveTheme = (orgId: string, siteId: string, definition: Pick<SavedTheme, "name" | "tokens">, id?: string) =>
  apiRequest<{ preset: SavedTheme }>(`${root(orgId, siteId)}/style-presets${id ? `/${encodeURIComponent(id)}` : ""}`, { method: id ? "PATCH" : "POST", body: definition });
export const deleteTheme = (orgId: string, siteId: string, id: string) =>
  apiRequest<void>(`${root(orgId, siteId)}/style-presets/${encodeURIComponent(id)}`, { method: "DELETE" });
export const setDefaultTheme = (orgId: string, siteId: string, selection: ThemeSelection | { source: "none" }) =>
  apiRequest<Pick<SiteThemeResponse, "active">>(`${root(orgId, siteId)}/theme/default`, { method: "PUT", body: selection });
export const getThemePreviews = (orgId: string, siteId: string, tokens: SiteThemeTokens) =>
  apiRequest<{ previews: ThemePreview[]; templates: ExperienceTemplateSummary[] }>(`${root(orgId, siteId)}/theme-previews`, { method: "POST", body: tokens });

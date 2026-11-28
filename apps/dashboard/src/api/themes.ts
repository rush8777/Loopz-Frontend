import { apiRequest } from "./client";
import type { SavedTheme, SiteThemeResponse, SiteThemeTokens, ThemeCapture, ThemeEditScope, ThemeImportResult, ThemePreview, ThemeProposal, ThemeSelection } from "../types/themes";
import type { ExperienceTemplateSummary } from "./experiences";

const root = (orgId: string, siteId: string) => `/orgs/${orgId}/sites/${siteId}`;
export const getSiteTheme = (orgId: string, siteId: string) => apiRequest<SiteThemeResponse>(`${root(orgId, siteId)}/theme`);
export const createThemeCapture = (orgId: string, siteId: string, signal?: AbortSignal) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures`, { method: "POST", body: { explicit: true }, signal });
export const getThemeCapture = (orgId: string, siteId: string, captureId: string, signal?: AbortSignal) => apiRequest<{ capture: ThemeCapture }>(`${root(orgId, siteId)}/theme-captures/${encodeURIComponent(captureId)}`, { signal });
export const activateTheme = (orgId: string, siteId: string, captureId: string, tokens: SiteThemeTokens) => apiRequest<Pick<SiteThemeResponse, "active" | "candidate">>(`${root(orgId, siteId)}/theme`, { method: "PUT", body: { captureId, tokens } });
export const discardThemeCandidate = (orgId: string, siteId: string) => apiRequest<void>(`${root(orgId, siteId)}/theme-candidate`, { method: "DELETE" });
export const listSavedThemes = (orgId: string, siteId: string) => apiRequest<{ presets: SavedTheme[] }>(`${root(orgId, siteId)}/style-presets`);
export const saveTheme = (orgId: string, siteId: string, definition: Pick<SavedTheme, "name" | "tokens"> & { sourceCaptureId?: string; sourcePresetId?: string; sourceFallback?: boolean; expectedUpdatedAt?: string }, id?: string) =>
  apiRequest<{ preset: SavedTheme }>(`${root(orgId, siteId)}/style-presets${id ? `/${encodeURIComponent(id)}` : ""}`, { method: id ? "PATCH" : "POST", body: definition });
export const deleteTheme = (orgId: string, siteId: string, id: string) =>
  apiRequest<void>(`${root(orgId, siteId)}/style-presets/${encodeURIComponent(id)}`, { method: "DELETE" });
export const setDefaultTheme = (orgId: string, siteId: string, selection: ThemeSelection | { source: "none" }) =>
  apiRequest<Pick<SiteThemeResponse, "active">>(`${root(orgId, siteId)}/theme/default`, { method: "PUT", body: selection });
export const getThemePreviews = (orgId: string, siteId: string, tokens: SiteThemeTokens, signal?: AbortSignal) =>
  apiRequest<{ previews: ThemePreview[]; templates: ExperienceTemplateSummary[] }>(`${root(orgId, siteId)}/theme-previews`, { method: "POST", body: tokens, signal });


const designPath = (orgId: string, siteId: string, captureId: string) => `${root(orgId, siteId)}/theme-captures/${encodeURIComponent(captureId)}/design`;
export const getImportedDesign = (orgId: string, siteId: string, captureId: string, signal?: AbortSignal) =>
  apiRequest<ThemeImportResult>(designPath(orgId, siteId, captureId), { signal });
export const generateImportedDesign = (orgId: string, siteId: string, captureId: string, retry: boolean, signal: AbortSignal) =>
  apiRequest<ThemeImportResult>(designPath(orgId, siteId, captureId), { method: "POST", body: { retry }, signal });
export const proposeThemeEdit = (orgId: string, siteId: string, body: { tokens: SiteThemeTokens; request: string; scope: ThemeEditScope; revision: number; history?: { request: string; reply: string }[] }, signal: AbortSignal) =>
  apiRequest<ThemeProposal>(`${root(orgId, siteId)}/theme-proposals`, { method: "POST", body, signal });

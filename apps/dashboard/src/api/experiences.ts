import { apiRequest } from "./client";
import type { Experience, ExperienceAnalytics, ExperienceDefinition, ExperienceKind, SurveyResponseRecord, WidgetType } from "../types/experiences";
export interface CreateExperienceInput { kind: ExperienceKind; widgetType?: WidgetType | null; name: string; buildPageId?: string | null; buildUrl?: string | null; template: "blank" | "default" | "minimal" | "soft" | "compact"; useBuildPageAsTarget: boolean }
const base = (orgId: string, siteId: string) => `/orgs/${orgId}/sites/${siteId}/experiences`;
export function listExperiences(orgId: string, siteId: string, kind?: ExperienceKind, widgetType?: WidgetType) { return apiRequest<{ experiences: Experience[] }>(base(orgId, siteId), { query: { kind, widgetType } }); }
export function createExperience(orgId: string, siteId: string, input: CreateExperienceInput) { return apiRequest<Experience>(base(orgId, siteId), { method: "POST", body: input }); }
export function getExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}`); }
export function updateExperience(orgId: string, siteId: string, id: string, input: { name?: string; definition?: ExperienceDefinition }) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}`, { method: "PATCH", body: input }); }
export function deleteExperience(orgId: string, siteId: string, id: string) { return apiRequest<void>(`${base(orgId, siteId)}/${id}`, { method: "DELETE" }); }
export function publishExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}/publish`, { method: "POST" }); }
export function pauseExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}/pause`, { method: "POST" }); }
export function createEditorSession(orgId: string, siteId: string, id: string) { return apiRequest<{ sessionId: string; launchUrl: string; expiresAt: string }>(`${base(orgId, siteId)}/${id}/editor-sessions`, { method: "POST" }); }
export function listExperienceAnalytics(orgId: string, siteId: string, query?: { since?: string; until?: string }) { return apiRequest<{ experiences: ExperienceAnalytics[] }>(`/orgs/${orgId}/sites/${siteId}/experience-analytics`, { query }); }
export function getExperienceAnalytics(orgId: string, siteId: string, id: string, query?: { since?: string; until?: string }) { return apiRequest<ExperienceAnalytics>(`${base(orgId, siteId)}/${id}/analytics`, { query }); }
export function listSurveyResponses(orgId: string, siteId: string, id: string, query?: { since?: string; until?: string; limit?: number; offset?: number }) { return apiRequest<{ responses: SurveyResponseRecord[]; total: number; limit: number; offset: number }>(`${base(orgId, siteId)}/${id}/responses`, { query }); }

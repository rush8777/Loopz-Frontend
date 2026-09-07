import { apiRequest } from "./client";
import type { Experience, ExperienceDefinition, ExperienceKind, WidgetType } from "../types/experiences";
export interface CreateExperienceInput { kind: ExperienceKind; widgetType?: WidgetType | null; name: string; buildPageId?: string | null; buildUrl?: string | null; template: "blank"; useBuildPageAsTarget: boolean }
const base = (orgId: string, siteId: string) => `/orgs/${orgId}/sites/${siteId}/experiences`;
export function listExperiences(orgId: string, siteId: string, kind?: ExperienceKind, widgetType?: WidgetType) { return apiRequest<{ experiences: Experience[] }>(base(orgId, siteId), { query: { kind, widgetType } }); }
export function createExperience(orgId: string, siteId: string, input: CreateExperienceInput) { return apiRequest<Experience>(base(orgId, siteId), { method: "POST", body: input }); }
export function getExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}`); }
export function updateExperience(orgId: string, siteId: string, id: string, input: { name?: string; definition?: ExperienceDefinition }) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}`, { method: "PATCH", body: input }); }
export function publishExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}/publish`, { method: "POST" }); }
export function pauseExperience(orgId: string, siteId: string, id: string) { return apiRequest<Experience>(`${base(orgId, siteId)}/${id}/pause`, { method: "POST" }); }
export function createEditorSession(orgId: string, siteId: string, id: string) { return apiRequest<{ sessionId: string; launchUrl: string; expiresAt: string }>(`${base(orgId, siteId)}/${id}/editor-sessions`, { method: "POST" }); }

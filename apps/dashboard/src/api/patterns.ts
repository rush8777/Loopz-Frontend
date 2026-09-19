import { apiRequest } from "./client";
import type { Pattern, PatternStep, PatternFeedback, PatternMatchLogEntry } from "../types/api";

export function listPatterns(orgId: string, siteId: string) {
  return apiRequest<{ patterns: Pattern[] }>(`/orgs/${orgId}/sites/${siteId}/patterns`);
}

export function createPattern(
  orgId: string,
  siteId: string,
  input: { name: string; matchWindowMs: number; steps: PatternStep[]; feedback: PatternFeedback }
) {
  return apiRequest<Pattern>(`/orgs/${orgId}/sites/${siteId}/patterns`, { method: "POST", body: input });
}

export function updatePattern(
  orgId: string,
  siteId: string,
  patternId: string,
  input: Partial<{ name: string; status: Pattern["status"]; matchWindowMs: number; steps: PatternStep[]; feedback: PatternFeedback }>
) {
  return apiRequest<Pattern>(`/orgs/${orgId}/sites/${siteId}/patterns/${patternId}`, { method: "PATCH", body: input });
}

export function deletePattern(orgId: string, siteId: string, patternId: string) {
  return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}/patterns/${patternId}`, { method: "DELETE" });
}

export function getPatternMatches(orgId: string, siteId: string, patternId: string) {
  return apiRequest<{ matches: PatternMatchLogEntry[] }>(
    `/orgs/${orgId}/sites/${siteId}/patterns/${patternId}/matches`
  );
}

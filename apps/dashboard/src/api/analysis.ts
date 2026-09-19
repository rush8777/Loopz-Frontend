import { apiRequest } from "./client";
import type { SimilarSessionMatch, ClusterResult, ObservationResult, PatternCandidate, PatternCandidateDetail } from "../types/api";

export function findSimilarSessions(
  orgId: string,
  siteId: string,
  input: { referenceTokens: string[]; threshold: number }
) {
  return apiRequest<{ matches: SimilarSessionMatch[] }>(`/orgs/${orgId}/sites/${siteId}/analysis/similar-sessions`, {
    method: "POST",
    body: input,
  });
}

export function clusterSessions(orgId: string, siteId: string, input?: { k?: number; minSessions?: number }) {
  return apiRequest<ClusterResult>(`/orgs/${orgId}/sites/${siteId}/analysis/cluster`, {
    method: "POST",
    body: input ?? {},
  });
}

export interface ObserveConfigInput {
  similarityThreshold?: number;
  minimumOccurrences?: number;
  maximumEpisodes?: number;
  maximumPatternLength?: number;
  minimumPatternLength?: number;
}

/** Re-runs the Pattern Observer pipeline over this site's current sessions and persists the result - a manual/batch trigger, not a live process. */
export function observePatterns(orgId: string, siteId: string, input?: ObserveConfigInput) {
  return apiRequest<ObservationResult>(`/orgs/${orgId}/sites/${siteId}/analysis/patterns/observe`, {
    method: "POST",
    body: input ?? {},
  });
}

export function listPatternCandidates(orgId: string, siteId: string) {
  return apiRequest<{ candidates: PatternCandidate[] }>(`/orgs/${orgId}/sites/${siteId}/analysis/patterns/candidates`);
}

export function getPatternCandidate(orgId: string, siteId: string, candidateId: string) {
  return apiRequest<PatternCandidateDetail>(`/orgs/${orgId}/sites/${siteId}/analysis/patterns/candidates/${candidateId}`);
}

import { apiRequest } from "./client";
import type { SimilarSessionMatch } from "../types/api";

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

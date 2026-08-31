import { apiRequest } from "./client";
import type { SessionSummary, SessionDetail, SessionActivity, SnapshotResponse } from "../types/api";

export function listSessions(orgId: string, siteId: string, opts?: { limit?: number; offset?: number }) {
  return apiRequest<{ sessions: SessionSummary[]; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/sessions`,
    { query: { limit: opts?.limit, offset: opts?.offset } }
  );
}

export function getSession(orgId: string, siteId: string, sessionId: string) {
  return apiRequest<SessionDetail>(`/orgs/${orgId}/sites/${siteId}/sessions/${sessionId}`);
}

export function getSessionActivity(orgId: string, siteId: string, sessionId: string, signal?: AbortSignal) {
  return apiRequest<SessionActivity>(`/orgs/${orgId}/sites/${siteId}/sessions/${sessionId}/activity`, { signal });
}

export function getSessionSnapshot(orgId: string, siteId: string, sessionId: string) {
  return apiRequest<SnapshotResponse>(`/orgs/${orgId}/sites/${siteId}/sessions/${sessionId}/snapshot`);
}

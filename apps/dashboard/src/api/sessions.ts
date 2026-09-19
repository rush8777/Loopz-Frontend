import { apiRequest } from "./client";
import type { SessionSummary, SessionDetail, SessionActivity, SnapshotResponse } from "../types/api";

export interface SessionListOptions {
  limit?: number; offset?: number; search?: string; since?: string; until?: string; segmentId?: string;
  visitorType?: "identified" | "anonymous"; pageId?: string; eventName?: string; hasReplay?: "true" | "false";
  deviceType?: string; minDurationMs?: number; maxDurationMs?: number;
  sort?: "newest" | "oldest" | "longest" | "shortest" | "activity" | "clicks";
}
export function listSessions(orgId: string, siteId: string, opts: SessionListOptions = {}) {
  return apiRequest<{ sessions: SessionSummary[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/sessions`,
    { query: { limit: opts.limit, offset: opts.offset, search: opts.search, since: opts.since, until: opts.until, segmentId: opts.segmentId, visitorType: opts.visitorType, pageId: opts.pageId, eventName: opts.eventName, hasReplay: opts.hasReplay, deviceType: opts.deviceType, minDurationMs: opts.minDurationMs, maxDurationMs: opts.maxDurationMs, sort: opts.sort } }
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

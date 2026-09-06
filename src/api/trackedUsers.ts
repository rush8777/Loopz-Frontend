import { apiRequest } from "./client";
import type { TrackedUserSummary, TrackedUserDetail, TrackedUserProperty, UserActivityItem, SessionSummary } from "../types/api";

interface Paginated {
  total: number;
  limit: number;
  offset: number;
}

export function listUsers(orgId: string, siteId: string, opts: { search?: string; limit?: number; offset?: number; segmentId?: string; since?: string; until?: string; eventName?: string; pageId?: string; sort?: string } = {}) {
  return apiRequest<{ users: TrackedUserSummary[] } & Paginated>(`/orgs/${orgId}/sites/${siteId}/users`, {
    query: opts,
  });
}

export function getUser(orgId: string, siteId: string, userId: string) {
  return apiRequest<TrackedUserDetail>(`/orgs/${orgId}/sites/${siteId}/users/${userId}`);
}

export function getUserProperties(orgId: string, siteId: string, userId: string) {
  return apiRequest<{ properties: TrackedUserProperty[] }>(`/orgs/${orgId}/sites/${siteId}/users/${userId}/properties`);
}

export function getUserActivity(orgId: string, siteId: string, userId: string, opts: { limit?: number; offset?: number } = {}) {
  return apiRequest<{ activities: UserActivityItem[] } & Paginated>(
    `/orgs/${orgId}/sites/${siteId}/users/${userId}/activity`,
    { query: { limit: opts.limit, offset: opts.offset } }
  );
}

export function getUserSessions(orgId: string, siteId: string, userId: string, opts: { limit?: number; offset?: number } = {}) {
  return apiRequest<{ sessions: SessionSummary[] } & Paginated>(
    `/orgs/${orgId}/sites/${siteId}/users/${userId}/sessions`,
    { query: { limit: opts.limit, offset: opts.offset } }
  );
}

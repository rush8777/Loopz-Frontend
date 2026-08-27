import { apiRequest } from "./client";
import type { AnonymousVisitorSummary, AnonymousVisitorDetail, UserActivityItem, SessionSummary } from "../types/api";

interface Paginated {
  total: number;
  limit: number;
  offset: number;
}

export function listAnonymousVisitors(
  orgId: string,
  siteId: string,
  opts: { search?: string; limit?: number; offset?: number } = {}
) {
  return apiRequest<{ visitors: AnonymousVisitorSummary[] } & Paginated>(`/orgs/${orgId}/sites/${siteId}/anonymous-users`, {
    query: { search: opts.search, limit: opts.limit, offset: opts.offset },
  });
}

export function getAnonymousVisitor(orgId: string, siteId: string, anonymousId: string) {
  return apiRequest<AnonymousVisitorDetail>(`/orgs/${orgId}/sites/${siteId}/anonymous-users/${anonymousId}`);
}

export function getAnonymousVisitorActivity(
  orgId: string,
  siteId: string,
  anonymousId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  return apiRequest<{ activities: UserActivityItem[] } & Paginated>(
    `/orgs/${orgId}/sites/${siteId}/anonymous-users/${anonymousId}/activity`,
    { query: { limit: opts.limit, offset: opts.offset } }
  );
}

export function getAnonymousVisitorSessions(
  orgId: string,
  siteId: string,
  anonymousId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  return apiRequest<{ sessions: SessionSummary[] } & Paginated>(
    `/orgs/${orgId}/sites/${siteId}/anonymous-users/${anonymousId}/sessions`,
    { query: { limit: opts.limit, offset: opts.offset } }
  );
}

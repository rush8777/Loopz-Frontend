import { apiRequest } from "./client";
import type {
  EventDefinitionSummary,
  EventSummary,
  TimeseriesPoint,
  PropertySummary,
  EventOccurrence,
  EventUserSummary,
  EventSessionSummary,
  EventPageSummary,
} from "../types/api";

export interface EventDateRange {
  since?: string; // ISO
  until?: string; // ISO
}

export interface Paginated {
  limit?: number;
  offset?: number;
}

export function listEvents(orgId: string, siteId: string, opts: { search?: string } & EventDateRange & Paginated = {}) {
  return apiRequest<{ events: EventDefinitionSummary[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/events`,
    { query: { search: opts.search, since: opts.since, until: opts.until, limit: opts.limit, offset: opts.offset } }
  );
}

export function getEventSummary(orgId: string, siteId: string, eventName: string, range: EventDateRange = {}) {
  return apiRequest<EventSummary>(`/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}`, {
    query: { since: range.since, until: range.until },
  });
}

export function getEventTimeseries(orgId: string, siteId: string, eventName: string, range: EventDateRange = {}) {
  return apiRequest<{ points: TimeseriesPoint[]; since: string; until: string }>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/timeseries`,
    { query: { since: range.since, until: range.until } }
  );
}

export function getEventProperties(orgId: string, siteId: string, eventName: string, range: EventDateRange = {}) {
  return apiRequest<{ properties: PropertySummary[]; sampledOccurrences: number; totalOccurrences: number }>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/properties`,
    { query: { since: range.since, until: range.until } }
  );
}

export function listEventOccurrences(
  orgId: string,
  siteId: string,
  eventName: string,
  opts: EventDateRange & Paginated = {}
) {
  return apiRequest<{ occurrences: EventOccurrence[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/occurrences`,
    { query: { since: opts.since, until: opts.until, limit: opts.limit, offset: opts.offset } }
  );
}

export function getEventOccurrence(orgId: string, siteId: string, eventName: string, occurrenceId: string) {
  return apiRequest<EventOccurrence>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/occurrences/${occurrenceId}`
  );
}

export function getEventUsers(orgId: string, siteId: string, eventName: string, opts: EventDateRange & Paginated = {}) {
  return apiRequest<{ users: EventUserSummary[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/users`,
    { query: { since: opts.since, until: opts.until, limit: opts.limit, offset: opts.offset } }
  );
}

export function getEventSessions(orgId: string, siteId: string, eventName: string, opts: EventDateRange & Paginated = {}) {
  return apiRequest<{ sessions: EventSessionSummary[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/sessions`,
    { query: { since: opts.since, until: opts.until, limit: opts.limit, offset: opts.offset } }
  );
}

export function getEventPages(orgId: string, siteId: string, eventName: string, range: EventDateRange = {}) {
  return apiRequest<{ pages: EventPageSummary[] }>(`/orgs/${orgId}/sites/${siteId}/events/${encodeURIComponent(eventName)}/pages`, {
    query: { since: range.since, until: range.until },
  });
}

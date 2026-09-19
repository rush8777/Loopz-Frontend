import { apiRequest } from "./client";
import type { Segment, SegmentDefinition, SegmentMember } from "../types/api";

export interface SegmentInput {
  name: string;
  description?: string;
  definition: SegmentDefinition;
}

export function listSegments(orgId: string, siteId: string, opts: { search?: string; limit?: number; offset?: number } = {}) {
  return apiRequest<{ segments: Segment[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/segments`,
    { query: { search: opts.search, limit: opts.limit, offset: opts.offset } }
  );
}

export function getSegment(orgId: string, siteId: string, segmentId: string) {
  return apiRequest<Segment>(`/orgs/${orgId}/sites/${siteId}/segments/${segmentId}`);
}

export function createSegment(orgId: string, siteId: string, input: SegmentInput) {
  return apiRequest<Segment>(`/orgs/${orgId}/sites/${siteId}/segments`, { method: "POST", body: input });
}

export function updateSegment(orgId: string, siteId: string, segmentId: string, input: Partial<SegmentInput>) {
  return apiRequest<Segment>(`/orgs/${orgId}/sites/${siteId}/segments/${segmentId}`, { method: "PATCH", body: input });
}

export function deleteSegment(orgId: string, siteId: string, segmentId: string) {
  return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}/segments/${segmentId}`, { method: "DELETE" });
}

/** Evaluates a candidate definition (may not be saved yet) for the builder's live audience preview - never persists anything. */
export function previewSegment(orgId: string, siteId: string, definition: SegmentDefinition) {
  return apiRequest<{ audienceCount: number }>(`/orgs/${orgId}/sites/${siteId}/segments/preview`, {
    method: "POST",
    body: { definition },
  });
}

export function getSegmentMembers(
  orgId: string,
  siteId: string,
  segmentId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  return apiRequest<{ members: SegmentMember[]; total: number; limit: number; offset: number }>(
    `/orgs/${orgId}/sites/${siteId}/segments/${segmentId}/members`,
    { query: { limit: opts.limit, offset: opts.offset } }
  );
}

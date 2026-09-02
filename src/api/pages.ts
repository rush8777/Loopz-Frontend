import { apiRequest } from "./client";
import type { HeatmapDateRange, HeatmapDevice, HeatmapIndexRow, HeatmapLayer, PageDefinition, PageDetail, PageElement, PageHeatmapResult, PageHeatmapState, PageRule, PageType, UntaggedUrl, PagePreviewResult } from "../types/api";

export interface PageInput {
  name: string;
  description?: string;
  area?: string;
  pageType?: PageType;
  rules: PageRule[];
  heatmapEnabled?: boolean;
}

export function listPages(orgId: string, siteId: string) {
  return apiRequest<{ pages: PageDefinition[] }>(`/orgs/${orgId}/sites/${siteId}/pages`);
}

export function getPage(orgId: string, siteId: string, pageId: string) {
  return apiRequest<PageDetail>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}`);
}

export function listPageElements(orgId: string, siteId: string, pageId: string) {
  return apiRequest<{ elements: PageElement[] }>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/elements`);
}

export function createPage(orgId: string, siteId: string, input: PageInput) {
  return apiRequest<PageDefinition>(`/orgs/${orgId}/sites/${siteId}/pages`, { method: "POST", body: input });
}

export function updatePage(orgId: string, siteId: string, pageId: string, input: Partial<PageInput>) {
  return apiRequest<PageDefinition>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}`, { method: "PATCH", body: input });
}

export function deletePage(orgId: string, siteId: string, pageId: string) {
  return apiRequest<void>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}`, { method: "DELETE" });
}

export function listUntaggedUrls(orgId: string, siteId: string) {
  return apiRequest<{ untagged: UntaggedUrl[] }>(`/orgs/${orgId}/sites/${siteId}/pages/untagged`);
}

export function previewPageRules(orgId: string, siteId: string, rules: PageRule[]) {
  return apiRequest<PagePreviewResult>(`/orgs/${orgId}/sites/${siteId}/pages/preview`, {
    method: "POST",
    body: { rules },
  });
}

export function listHeatmaps(orgId: string, siteId: string, range?: HeatmapDateRange) {
  return apiRequest<{ heatmaps: HeatmapIndexRow[] }>(`/orgs/${orgId}/sites/${siteId}/heatmaps`, { query: range ? { from: range.from, to: range.to } : undefined });
}

export function listPageHeatmapStates(orgId: string, siteId: string, pageId: string) {
  return apiRequest<{ states: PageHeatmapState[] }>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/heatmap/states`);
}

export function createPageHeatmapState(orgId: string, siteId: string, pageId: string, input: { name: string; selector: string }) {
  return apiRequest<PageHeatmapState>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/heatmap/states`, { method: "POST", body: input });
}

export function getPageHeatmap(orgId: string, siteId: string, pageId: string, query: { stateId: string; device: HeatmapDevice; layer: HeatmapLayer } & HeatmapDateRange) {
  return apiRequest<PageHeatmapResult>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/heatmap`, { query: { stateId: query.stateId, device: query.device, layer: query.layer, from: query.from, to: query.to } });
}

export function requestPageHeatmapCapture(orgId: string, siteId: string, pageId: string, input: { stateId: string; device: HeatmapDevice; targetUrl?: string }) {
  return apiRequest<{ captureUrl: string; expiresAt: string; requestId: string }>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/heatmap/capture-request`, { method: "POST", body: input });
}

export function getPageHeatmapCaptureStatus(orgId: string, siteId: string, pageId: string, requestId: string) {
  return apiRequest<{ status: "pending" | "complete" | "expired" }>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}/heatmap/capture-request/${requestId}`);
}

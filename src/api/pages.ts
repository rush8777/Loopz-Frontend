import { apiRequest } from "./client";
import type { PageDefinition, PageDetail, PageRule, PageType, UntaggedUrl, PagePreviewResult } from "../types/api";

export interface PageInput {
  name: string;
  description?: string;
  area?: string;
  pageType?: PageType;
  rules: PageRule[];
}

export function listPages(orgId: string, siteId: string) {
  return apiRequest<{ pages: PageDefinition[] }>(`/orgs/${orgId}/sites/${siteId}/pages`);
}

export function getPage(orgId: string, siteId: string, pageId: string) {
  return apiRequest<PageDetail>(`/orgs/${orgId}/sites/${siteId}/pages/${pageId}`);
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

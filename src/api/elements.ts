import { apiRequest } from "./client";
import type { CatalogElement } from "../types/api";

export function listElements(orgId: string, siteId: string) {
  return apiRequest<{ elements: CatalogElement[] }>(`/orgs/${orgId}/sites/${siteId}/elements`);
}

export function updateElement(
  orgId: string,
  siteId: string,
  elementId: string,
  input: Partial<{ label: string; isIgnored: boolean }>
) {
  return apiRequest<CatalogElement>(`/orgs/${orgId}/sites/${siteId}/elements/${elementId}`, {
    method: "PATCH",
    body: input,
  });
}

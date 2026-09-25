import { apiRequest } from "./client";
import type { Org } from "../types/api";

export function updateOrganization(orgId: string, input: { name: string }) {
  return apiRequest<Org>(`/orgs/${orgId}`, { method: "PATCH", body: input });
}

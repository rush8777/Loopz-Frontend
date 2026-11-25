import { apiRequest } from "./client";

export type KnowledgeSourceType = "website" | "url" | "file" | "manual";
export type KnowledgeVisibility = "private" | "public";

export interface KnowledgeJob {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed" | "cancelled";
  attempts: number;
  completed: number;
  total: number;
  errorCode: string | null;
}
export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  visibility: KnowledgeVisibility;
  enabled: boolean;
  syncHours: number | null;
  lastSyncedAt: string | null;
  status: "idle" | "disabled" | "queued" | "processing" | "ready" | "failed";
  documentCount: number;
  job: KnowledgeJob | null;
}
export type SourceConfig = {
  url?: string; title?: string; content?: string; data?: string; filename?: string;
  pageLimit?: number; crawlDepth?: number; excludePaths?: string[]; includePaths?: string[];
};
export interface KnowledgeSourceInput {
  name: string;
  type: KnowledgeSourceType;
  visibility: KnowledgeVisibility;
  syncHours: number | null;
  config: SourceConfig;
}
export interface KnowledgeDocument { id: string; title: string; url: string | null; excluded: boolean }
export interface KnowledgeMatch {
  chunkId: string; documentId: string; sourceId: string; title: string;
  heading: string | null; content: string; url: string | null; score: number;
}

export function knowledgeApi(orgId: string, siteId: string) {
  const base = `/orgs/${encodeURIComponent(orgId)}/sites/${encodeURIComponent(siteId)}/knowledge`;
  const sourcePath = (id: string) => `${base}/sources/${encodeURIComponent(id)}`;
  return {
    async list(signal?: AbortSignal) {
      return (await apiRequest<{ sources: KnowledgeSource[] }>(`${base}/sources`, { signal })).sources;
    },
    async details(id: string) {
      return (await apiRequest<{ source: KnowledgeSource & { config: SourceConfig } }>(sourcePath(id))).source;
    },
    create(input: KnowledgeSourceInput) {
      return apiRequest(`${base}/sources`, { method: "POST", body: input });
    },
    update(id: string, input: Partial<Omit<KnowledgeSourceInput, "type">> & { enabled?: boolean }) {
      return apiRequest(sourcePath(id), { method: "PATCH", body: input });
    },
    delete(id: string) {
      return apiRequest(sourcePath(id), { method: "DELETE" });
    },
    sync(id: string) {
      return apiRequest(`${sourcePath(id)}/sync`, { method: "POST" });
    },
    cancel(id: string, job: string) {
      return apiRequest(`${sourcePath(id)}/jobs/${encodeURIComponent(job)}/cancel`, { method: "POST" });
    },
    async documents(id: string) {
      return (await apiRequest<{ documents: KnowledgeDocument[] }>(`${sourcePath(id)}/documents`)).documents;
    },
    setExcluded(id: string, documentId: string, excluded: boolean) {
      return apiRequest(`${sourcePath(id)}/documents/${encodeURIComponent(documentId)}`, { method: "PATCH", body: { excluded } });
    },
    async retrieve(question: string, sourceIds?: string[]) {
      return (await apiRequest<{ matches: KnowledgeMatch[] }>(`${base}/retrieve`, { method: "POST", body: { question, sourceIds } })).matches;
    },
  };
}

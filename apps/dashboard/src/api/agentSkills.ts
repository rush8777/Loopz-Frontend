import { apiRequest } from "./client";

export interface SkillMetadata {
  name: string;
  description: string;
  intentExamples: string[];
  keywords: string[];
  preconditions: string[];
  completionEvidence?: string;
}

export interface SkillRegistration {
  enabled: boolean;
  metadata?: SkillMetadata;
}

export interface AgentSkill {
  id: string;
  revision: string;
  guideId: string;
  guideVersionId: string;
  metadata: SkillMetadata;
  enabled: boolean;
  status: "pending" | "ready" | "failed" | "disabled" | "unavailable";
}

export const skillStatus: Record<AgentSkill["status"], string> = {
  pending: "Indexing pending", ready: "Ready", failed: "Indexing failed", disabled: "Disabled", unavailable: "Guide version unavailable",
};

export const agentSkills = (orgId: string, siteId: string) => {
  const base = `/orgs/${encodeURIComponent(orgId)}/sites/${encodeURIComponent(siteId)}/agent-skills`;
  const guide = (id: string) => `${base}/${encodeURIComponent(id)}`;
  return {
    list: (signal?: AbortSignal) => apiRequest<{ skills: AgentSkill[] }>(base, { signal }),
    update: (id: string, guideVersionId: string, expectedRevision: string | null, skill: SkillRegistration) =>
      apiRequest<{ skill: AgentSkill }>(guide(id), { method: "PUT", body: { guideVersionId, expectedRevision, skill } }),
    suggest: (id: string, versionId: string, revision: number) =>
      apiRequest<{ metadata: SkillMetadata; method: "ai" | "manual"; issue?: string }>(`${guide(id)}/suggest`, { method: "POST", body: { versionId, revision } }),
  };
};

export type SkillSuggestion = Awaited<ReturnType<ReturnType<typeof agentSkills>["suggest"]>>;

import type { ExperienceTargeting } from "./experiences";

export interface GeoAgentConfig {
  schemaVersion: 1;
  appearance: {
    name: string; avatarUrl?: string; brandColor: string; theme: "light" | "dark" | "system";
    launcher: "icon" | "label"; launcherLabel: string; position: "bottom-left" | "bottom-right";
    welcome: string; placeholder: string; suggestions: string[];
  };
  enabled: boolean;
  showLauncher: boolean;
  persistence: "page" | "tab";
  sourceIds: string[];
  skillIds?: string[];
  instructions: string;
  fallback: string;
  identityPublicKey?: string;
}
export interface GeoAgentDefinition { geoAgent: GeoAgentConfig; targeting: ExperienceTargeting }
export interface GeoAgentCitation { documentId: string; title: string; url: string | null }
export interface GeoAgentMetrics {
  conversations: number; visitors: number; messages: number; responses: number; failed: number;
  helpful: number; unhelpful: number; answeredWithKnowledge: number; tokens: number;
  averageLatencyMs: number | null; averageFirstDeltaMs: number | null;
}

export type GeoAgentPreviewContext = {
  mode: "admin" | "visitor";
  url?: string;
  identityToken?: string;
  priorQuestion?: string;
  targeting?: ExperienceTargeting;
};

export interface GeoAgentPreviewResult {
  message: string;
  citations: GeoAgentCitation[];
  decision?: { decision: "answer_only" | "clarify" | "insufficient_evidence" }
    | { decision: "recommend_skill"; skillId: string; reason: string };
  candidates: { id: string; name: string; score: number; eligible: boolean; reason?: string }[];
  documentation: { title: string; url: string | null; excerpt: string; score: number }[];
  retrievalMs: number;
  permitted: boolean;
}

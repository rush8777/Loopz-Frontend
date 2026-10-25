import { apiRequest } from "./client";

export type AiProposal =
  | { type: "dashboard"; data: { name: string; description?: string | null; cards: Array<{ title: string; cardType: string; width: string; configuration: Record<string, unknown> }> } }
  | { type: "segment"; data: { name: string; description?: string; definition: SegmentGroup } }
  | { type: "funnel"; data: { name: string; description?: string; steps: Array<{ type: "event"; eventName: string; label?: string } | { type: "page"; pageId: string; label?: string }>; conversionWindow?: { value: number; unit: "hours" | "days" } } };

export interface SegmentGroup { logic: "and" | "or"; conditions: Array<SegmentGroup | Record<string, unknown>> }
export interface AiEvidence { source: string; label: string; range?: { since: string; until: string }; sampleSize?: number; limitation?: string }
export interface AiApproval { id: string; status: "pending" | "approved" | "rejected"; resourceType: string; resourceId: string | null; decidedAt: string | null }
export interface AiMessage { id: string; role: "user" | "assistant"; content: string; evidence: AiEvidence[]; proposal: AiProposal | null; approval: AiApproval | null; createdAt: string }
export interface AiConversation { id: string; orgId: string; siteId: string; userId: string; title: string; createdAt: string; updatedAt: string }

const base = (orgId: string, siteId: string) => "/orgs/" + orgId + "/sites/" + siteId + "/ai";
export const getAiStatus = (orgId: string, siteId: string) => apiRequest<{ enabled: boolean; provider: string | null; model: string | null }>(base(orgId, siteId) + "/status");
export const listAiConversations = (orgId: string, siteId: string) => apiRequest<{ conversations: AiConversation[] }>(base(orgId, siteId) + "/conversations");
export const createAiConversation = (orgId: string, siteId: string, title?: string) => apiRequest<AiConversation>(base(orgId, siteId) + "/conversations", { method: "POST", body: title ? { title } : {} });
export const getAiConversation = (orgId: string, siteId: string, conversationId: string) => apiRequest<{ conversation: AiConversation; messages: AiMessage[] }>(base(orgId, siteId) + "/conversations/" + conversationId);
export const deleteAiConversation = (orgId: string, siteId: string, conversationId: string) => apiRequest<void>(base(orgId, siteId) + "/conversations/" + conversationId, { method: "DELETE" });
export const sendAiMessage = (orgId: string, siteId: string, conversationId: string, content: string, signal?: AbortSignal) => apiRequest<{ userMessage: AiMessage; assistantMessage: AiMessage; preview?: unknown }>(base(orgId, siteId) + "/conversations/" + conversationId + "/messages", { method: "POST", body: { content }, signal });
export const approveAiProposal = (orgId: string, siteId: string, approvalId: string) => apiRequest<{ approval: AiApproval; resource: { id: string; path: string } }>(base(orgId, siteId) + "/approvals/" + approvalId + "/approve", { method: "POST" });
export const rejectAiProposal = (orgId: string, siteId: string, approvalId: string) => apiRequest<{ approval: AiApproval }>(base(orgId, siteId) + "/approvals/" + approvalId + "/reject", { method: "POST" });

import { apiRequest } from "./client";
import type {
  InvitationDetail,
  InvitationRole,
  MembershipRole,
  OrganizationInvitation,
  TeamMember,
  User,
} from "../types/api";

export function listMembers(orgId: string) {
  return apiRequest<{ members: TeamMember[] }>(`/orgs/${orgId}/members`);
}

export function listInvitations(orgId: string) {
  return apiRequest<{ invitations: OrganizationInvitation[] }>(`/orgs/${orgId}/invitations`);
}

export function createInvitation(orgId: string, input: { email: string; role: InvitationRole }) {
  return apiRequest<{ invitation: OrganizationInvitation; inviteUrl: string }>(`/orgs/${orgId}/invitations`, {
    method: "POST",
    body: input,
  });
}

export function rotateInvitation(orgId: string, invitationId: string) {
  return apiRequest<{ invitation: OrganizationInvitation; inviteUrl: string }>(
    `/orgs/${orgId}/invitations/${invitationId}/rotate`,
    { method: "POST" },
  );
}

export function revokeInvitation(orgId: string, invitationId: string) {
  return apiRequest<void>(`/orgs/${orgId}/invitations/${invitationId}`, { method: "DELETE" });
}

export function updateMemberRole(orgId: string, userId: string, role: Exclude<MembershipRole, "OWNER">) {
  return apiRequest<{ userId: string; role: MembershipRole }>(`/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    body: { role },
  });
}

export function removeMember(orgId: string, userId: string) {
  return apiRequest<void>(`/orgs/${orgId}/members/${userId}`, { method: "DELETE" });
}

export function getInvitation(token: string) {
  return apiRequest<InvitationDetail>(`/auth/invitations/${encodeURIComponent(token)}`, { skipAuthRetry: true });
}

export function acceptInvitation(token: string) {
  return apiRequest<{ membership: { orgId: string; userId: string; role: MembershipRole } }>(
    `/auth/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
}

export function signupFromInvitation(token: string, input: { name: string; password: string }) {
  return apiRequest<{
    user: User;
    membership: { orgId: string; role: MembershipRole };
    accessToken: string;
    refreshToken: string;
  }>(`/auth/invitations/${encodeURIComponent(token)}/signup`, {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
}

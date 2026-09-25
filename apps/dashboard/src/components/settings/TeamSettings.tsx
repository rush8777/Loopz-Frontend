import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@movecues/ui";
import { Plus, Trash2 } from "lucide-react";
import * as teamApi from "../../api/team";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { InvitationRole, OrganizationInvitation, TeamMember } from "../../types/api";
import { CopyButton, SettingsHeading } from "./SettingsShared";

const MANAGEABLE_ROLES: InvitationRole[] = ["ADMIN", "MEMBER", "VIEWER"];

function displayRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function TeamSettings() {
  const { user } = useAuth();
  const { currentOrg } = useWorkspace();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";

  const refresh = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    try {
      const [memberResult, invitationResult] = await Promise.all([
        teamApi.listMembers(currentOrg.orgId),
        canManage ? teamApi.listInvitations(currentOrg.orgId) : Promise.resolve({ invitations: [] }),
      ]);
      setMembers(memberResult.members);
      setInvitations(invitationResult.invitations);
    } catch {
      setError("Couldn't load this workspace's team.");
    } finally {
      setLoading(false);
    }
  }, [canManage, currentOrg]);

  useEffect(() => { void refresh(); }, [refresh]);

  function closeInvite() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteUrl(null);
    setError(null);
  }

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await teamApi.createInvitation(currentOrg.orgId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail(result.invitation.email);
      setInviteUrl(result.inviteUrl);
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 409
        ? "That person is already a member or already has a pending invitation."
        : "Couldn't create the invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(member: TeamMember, role: InvitationRole) {
    if (!currentOrg) return;
    setError(null);
    try {
      await teamApi.updateMemberRole(currentOrg.orgId, member.userId, role);
      await refresh();
    } catch {
      setError("Couldn't update that member's role.");
    }
  }

  async function removeMember(member: TeamMember) {
    if (!currentOrg || !window.confirm(`Remove ${member.name ?? member.email} from this workspace?`)) return;
    setError(null);
    try {
      await teamApi.removeMember(currentOrg.orgId, member.userId);
      await refresh();
    } catch {
      setError("Couldn't remove that member.");
    }
  }

  async function rotateInvitation(invitation: OrganizationInvitation) {
    if (!currentOrg || !window.confirm("Generate a new invite link? The previous link will stop working.")) return;
    setError(null);
    try {
      const result = await teamApi.rotateInvitation(currentOrg.orgId, invitation.id);
      setInviteEmail(invitation.email);
      setInviteUrl(result.inviteUrl);
      setInviteOpen(true);
      await refresh();
    } catch {
      setError("Couldn't generate a new invitation link.");
    }
  }

  async function revokeInvitation(invitation: OrganizationInvitation) {
    if (!currentOrg || !window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    setError(null);
    try {
      await teamApi.revokeInvitation(currentOrg.orgId, invitation.id);
      await refresh();
    } catch {
      setError("Couldn't revoke that invitation.");
    }
  }

  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <SettingsHeading title="Team" description="Manage the people who can access this workspace." />
        {canManage && <Button type="button" size="sm" onClick={() => setInviteOpen(true)}><Plus />Invite member</Button>}
      </div>
      {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      {loading ? <p className="text-sm text-muted-foreground">Loading team…</p> : (
        <section className="overflow-hidden rounded-lg border bg-card" aria-label="Team members">
          {members.map((member) => {
            const isYou = member.userId === user?.id;
            const locked = member.role === "OWNER" || isYou || !canManage;
            return (
              <div key={member.userId} className="flex min-h-16 items-center gap-3 border-b px-3.5 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate text-[13px] font-medium">{member.name ?? member.email}</strong>{isYou && <Badge variant="outline">You</Badge>}</div><p className="m-0 truncate text-xs text-muted-foreground">{member.email}</p></div>
                {locked ? <span className="text-xs font-medium text-muted-foreground">{displayRole(member.role)}</span> : (
                  <>
                    <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => void changeRole(member, event.target.value as InvitationRole)} className="h-8 rounded-md border bg-input px-2 text-xs">
                      {MANAGEABLE_ROLES.map((role) => <option key={role} value={role}>{displayRole(role)}</option>)}
                    </select>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${member.email}`} onClick={() => void removeMember(member)}><Trash2 /></Button>
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {canManage && pendingInvitations.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Pending invitations</h3>
          <div className="overflow-hidden rounded-lg border bg-card">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex min-h-16 flex-wrap items-center gap-2 border-b px-3.5 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1"><strong className="block truncate text-[13px] font-medium">{invitation.email}</strong><span className="text-xs text-muted-foreground">{displayRole(invitation.role)} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void rotateInvitation(invitation)}>Generate new link</Button>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => void revokeInvitation(invitation)}>Revoke</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInvite(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{inviteUrl ? "Invitation created" : "Invite member"}</DialogTitle><DialogDescription>{inviteUrl ? "Share this private link with the invited person." : "Create a link for someone to join this workspace."}</DialogDescription></DialogHeader>
          {inviteUrl ? (
            <div className="mt-4 space-y-4"><div className="rounded-lg border bg-muted/40 p-3 text-sm">{inviteEmail}</div><CopyButton value={inviteUrl} label="invite link" /></div>
          ) : (
            <form id="invite-member-form" className="mt-4 space-y-4" onSubmit={(event) => void createInvite(event)}>
              <div className="grid gap-1.5"><Label htmlFor="invite-member-email">Email address</Label><Input id="invite-member-email" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="invite-member-role">Role</Label><select id="invite-member-role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as InvitationRole)} className="h-9 rounded-md border bg-input px-3 text-sm">{["MEMBER", "VIEWER", "ADMIN"].map((role) => <option key={role} value={role}>{displayRole(role)}</option>)}</select></div>
              {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
            </form>
          )}
          <DialogFooter className="mt-5">{inviteUrl ? <Button type="button" onClick={closeInvite}>Done</Button> : <><Button type="button" variant="ghost" onClick={closeInvite}>Cancel</Button><Button type="submit" form="invite-member-form" disabled={submitting || !inviteEmail.trim()}>{submitting ? "Creating…" : "Create invitation"}</Button></>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

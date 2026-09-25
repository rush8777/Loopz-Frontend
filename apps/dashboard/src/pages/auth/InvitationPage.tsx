import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Input, Label } from "@movecues/ui";
import * as teamApi from "../../api/team";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { InvitationDetail } from "../../types/api";
import { AuthLayout } from "./AuthLayout";

const fieldClass = "h-12 rounded-xl border-border bg-input px-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/20";

export function InvitationPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, bootstrapping, logout, signupFromInvitation } = useAuth();
  const { refreshOrgs, setCurrentOrgId } = useWorkspace();
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setLoading(true);
    teamApi
      .getInvitation(token)
      .then(setInvitation)
      .catch(() => setError("This invitation is invalid, expired, revoked, or has already been used."))
      .finally(() => setLoading(false));
  }, [token]);

  async function enterWorkspace(orgId: string) {
    await refreshOrgs?.();
    setCurrentOrgId(orgId);
    navigate("/", { replace: true });
  }

  async function accept() {
    if (!invitation) return;
    setJoining(true);
    setError(null);
    try {
      const result = await teamApi.acceptInvitation(token);
      await enterWorkspace(result.membership.orgId);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 403
        ? `This invitation belongs to ${invitation.email}. Sign in with that account to continue.`
        : "This invitation could not be accepted. It may no longer be valid.");
    } finally {
      setJoining(false);
    }
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const result = await signupFromInvitation(token, { name: name.trim(), password });
      await enterWorkspace(result.orgId);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 409
        ? "An account already exists for this email. Sign in instead."
        : caught instanceof ApiError && caught.status === 400
          ? "Enter your name and a password of at least 10 characters."
          : "This invitation could not be accepted. It may no longer be valid.");
    } finally {
      setJoining(false);
    }
  }

  if (loading || bootstrapping) {
    return <main className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">Loading invitation…</main>;
  }
  if (!invitation) {
    return <main className="grid min-h-dvh place-items-center bg-background p-6"><div className="max-w-md rounded-xl border bg-card p-6 text-center"><h1 className="m-0 text-xl font-semibold">Invitation unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button asChild className="mt-4"><Link to="/login">Go to sign in</Link></Button></div></main>;
  }

  const matchesUser = user?.email.toLowerCase() === invitation.email.toLowerCase();
  return (
    <AuthLayout
      mode="signup"
      title={`You've been invited to ${invitation.organization.name}`}
      subtitle="Join this workspace without creating a separate organization."
      footer={<></>}
    >
      <div className="mb-6 rounded-xl border bg-card p-4">
        <p className="m-0 text-sm font-medium">{invitation.email}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Role</span><Badge variant="outline">{invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}</Badge></div>
      </div>
      {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      {user && matchesUser && <Button className="h-12 w-full" onClick={() => void accept()} disabled={joining}>{joining ? "Joining…" : "Join workspace"}</Button>}
      {user && !matchesUser && (
        <div className="space-y-4">
          <Alert>You are signed in as {user.email}, but this invitation belongs to {invitation.email}.</Alert>
          <Button variant="outline" className="w-full" onClick={() => void logout()}>Sign out and switch account</Button>
        </div>
      )}
      {!user && !showSignup && (
        <div className="space-y-3">
          <Button asChild className="h-11 w-full"><Link to="/login" state={{ returnTo: `/invite/${token}` }}>Sign in</Link></Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => setShowSignup(true)}>Create account and join</Button>
          <p className="m-0 text-center text-xs text-muted-foreground">Already have an account? Sign in. New to Movecues? Create an account here.</p>
        </div>
      )}
      {!user && showSignup && (
        <form className="space-y-4" onSubmit={(event) => void createAccount(event)}>
          <div className="grid gap-1.5"><Label htmlFor="invite-email">Email address</Label><Input id="invite-email" value={invitation.email} readOnly className={fieldClass} /></div>
          <div className="grid gap-1.5"><Label htmlFor="invite-name">Name</Label><Input id="invite-name" required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></div>
          <div className="grid gap-1.5"><Label htmlFor="invite-password">Password</Label><Input id="invite-password" type="password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} /></div>
          <Button type="submit" className="h-12 w-full" disabled={joining}>{joining ? "Creating account…" : "Create account and join"}</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setShowSignup(false)}>Back</Button>
        </form>
      )}
    </AuthLayout>
  );
}

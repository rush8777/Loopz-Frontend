import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movecues/ui";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { GoogleAuthButton, isGoogleAuthConfigured } from "../../components/auth/GoogleAuthButton";
import { AuthLayout } from "./AuthLayout";

const fieldClass = "h-12 rounded-xl border-border bg-input px-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/20";

function apiErrorCode(error: unknown) {
  return error instanceof ApiError && error.body && typeof error.body === "object"
    ? (error.body as { error?: unknown }).error
    : undefined;
}

export function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, password, orgName });
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 409 ? "An account with that email already exists." : caught instanceof ApiError && caught.status === 400 ? "Password must be at least 10 characters." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const onGoogleCredential = useCallback(async (credential: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await googleLogin(credential);
      navigate("/", { replace: true });
    } catch (caught) {
      const code = apiErrorCode(caught);
      if (code === "google_signup_required") {
        setPendingGoogleCredential(credential);
        setError("Enter an organization name to finish creating your workspace.");
      } else {
        setError(code === "invalid_google_credential" ? "Google sign-in couldn't be verified. Please try again." : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [googleLogin, navigate]);

  async function completeGoogleSignup() {
    if (!pendingGoogleCredential || !orgName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await googleLogin(pendingGoogleCredential, orgName.trim());
      setPendingGoogleCredential(null);
      navigate("/", { replace: true });
    } catch (caught) {
      setError(apiErrorCode(caught) === "invalid_google_credential" ? "Google sign-in couldn't be verified. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const onGoogleError = useCallback((message: string) => setError(message), []);

  return <AuthLayout mode="signup" title="Create your account" subtitle="Start with a workspace for you and your team." footer={<p className="mt-7 mb-0 text-[14px] text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-primary underline decoration-primary/45 decoration-2 underline-offset-4 hover:text-[var(--primary-hover)]">Sign in</Link></p>}>
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
    <div className="mb-5 grid gap-1.5"><Label htmlFor="orgName" className="text-[13px] font-medium text-foreground">Organization name</Label><Input id="orgName" required value={orgName} onChange={(event) => setOrgName(event.target.value)} placeholder="Acme Inc." className={fieldClass} /></div>
    {isGoogleAuthConfigured && <>{pendingGoogleCredential ? <Button type="button" className="h-12 w-full rounded-xl" disabled={submitting || !orgName.trim()} onClick={() => void completeGoogleSignup()}>{submitting ? "Creating workspace…" : "Create workspace with Google"}</Button> : <GoogleAuthButton onCredential={onGoogleCredential} onError={onGoogleError} disabled={submitting} />}<div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or continue with email</div></>}
    {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      <div className="grid gap-1.5"><Label htmlFor="email" className="text-[13px] font-medium text-foreground">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className={fieldClass} /></div>
      <div className="grid gap-1.5"><Label htmlFor="password" className="text-[13px] font-medium text-foreground">Create password</Label><Input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" className={fieldClass} /></div>
      <Button type="submit" className="mt-2 h-12 w-full rounded-xl border-0 bg-primary text-[14px] font-semibold text-primary-foreground shadow-none hover:bg-[var(--primary-hover)]" disabled={submitting}>{submitting ? "Creating workspace…" : "Create workspace"}</Button>
    </form>
  </AuthLayout>;
}

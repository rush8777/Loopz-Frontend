import { useCallback, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movcues/ui";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { AuthLayout } from "./AuthLayout";

const fieldClass = "h-12 rounded-xl border-border bg-input px-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/20";

function apiErrorCode(error: unknown) {
  return error instanceof ApiError && error.body && typeof error.body === "object"
    ? (error.body as { error?: unknown }).error
    : undefined;
}

export function SignupPage() {
  const { signup, googleLogin, user, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, password });
      navigate(returnTo ?? "/", { replace: true });
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
      navigate(returnTo ?? "/", { replace: true });
    } catch (caught) {
      const code = apiErrorCode(caught);
      setError(code === "invalid_google_credential" ? "Google sign-in couldn't be verified. Please try again." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [googleLogin, navigate]);

  const onGoogleError = useCallback((message: string) => setError(message), []);

  // Keep every hook above this guard. `bootstrapping` flips after the first
  // render, so returning before the callbacks would change the hook order.
  if (bootstrapping) return null;
  if (user) return <Navigate to={returnTo ?? "/"} replace />;

  return <AuthLayout mode="signup" title="Create your account" subtitle="A quick setup will create your workspace and connect your first site." footer={<p className="mt-7 mb-0 text-[14px] text-muted-foreground">Already have an account? <Link to="/login" state={{ returnTo }} className="font-semibold text-primary underline decoration-primary/45 decoration-2 underline-offset-4 hover:text-[var(--primary-hover)]">Sign in</Link></p>}>
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
    <><GoogleAuthButton onCredential={onGoogleCredential} onError={onGoogleError} disabled={submitting} /><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or continue with email</div></>
    {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      <div className="grid gap-1.5"><Label htmlFor="email" className="text-[13px] font-medium text-foreground">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className={fieldClass} /></div>
      <div className="grid gap-1.5"><Label htmlFor="password" className="text-[13px] font-medium text-foreground">Create password</Label><Input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" className={fieldClass} /></div>
      <Button type="submit" className="mt-2 h-12 w-full rounded-xl border-0 bg-primary text-[14px] font-semibold text-primary-foreground shadow-none hover:bg-[var(--primary-hover)]" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</Button>
    </form>
  </AuthLayout>;
}

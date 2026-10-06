import { useCallback, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movcues/ui";
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

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSignupLink, setShowSignupLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setShowSignupLink(false);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(returnTo ?? "/", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 401 ? "Incorrect email or password." : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const onGoogleCredential = useCallback(async (credential: string) => {
    setError(null);
    setShowSignupLink(false);
    setSubmitting(true);
    try {
      await googleLogin(credential);
      navigate(returnTo ?? "/", { replace: true });
    } catch (caught) {
      const code = apiErrorCode(caught);
      if (code === "google_signup_required") setShowSignupLink(true);
      setError(code === "google_signup_required"
        ? "No movcues account exists for this Google account yet."
        : code === "invalid_google_credential"
          ? "Google sign-in couldn't be verified. Please try again."
          : code === "google_auth_not_configured"
            ? "Google sign-in is not configured. Use email and password instead."
            : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [googleLogin, navigate, returnTo]);

  const onGoogleError = useCallback((message: string) => setError(message), []);

  return <AuthLayout mode="login" title="Welcome back" subtitle="Enter your details to access your workspace." footer={<p className="mt-7 mb-0 text-[14px] text-muted-foreground">{returnTo ? <Link to={returnTo} className="font-semibold text-primary underline decoration-primary/45 decoration-2 underline-offset-4 hover:text-[var(--primary-hover)]">Return to invitation</Link> : <>New to movcues? <Link to="/signup" className="font-semibold text-primary underline decoration-primary/45 decoration-2 underline-offset-4 hover:text-[var(--primary-hover)]">Create an account</Link></>}</p>}>
    {isGoogleAuthConfigured && <><GoogleAuthButton onCredential={onGoogleCredential} onError={onGoogleError} disabled={submitting} /><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or continue with email</div></>}
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-1.5"><Label htmlFor="email" className="text-[13px] font-medium text-foreground">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className={fieldClass} /></div>
      <div className="grid gap-1.5"><Label htmlFor="password" className="text-[13px] font-medium text-foreground">Password</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" className={fieldClass} /></div>
      {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      {showSignupLink && <Button asChild variant="outline" className="h-11 w-full"><Link to="/signup">Create an account</Link></Button>}
      <Button type="submit" className="mt-2 h-12 w-full rounded-xl border-0 bg-primary text-[14px] font-semibold text-primary-foreground shadow-none hover:bg-[var(--primary-hover)]" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
    </form>
  </AuthLayout>;
}

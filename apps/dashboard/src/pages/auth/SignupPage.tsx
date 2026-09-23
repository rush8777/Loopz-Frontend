import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Input, Label } from "@movecues/ui";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { AuthLayout } from "./AuthLayout";

const fieldClass = "h-12 rounded-xl border-border bg-input px-4 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/20";

export function SignupPage() {
  const { signup } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e: FormEvent) { e.preventDefault(); setError(null); setSubmitting(true); try { await signup({ email, password, orgName }); navigate("/", { replace: true }); } catch (err) { setError(err instanceof ApiError && err.status === 409 ? "An account with that email already exists." : err instanceof ApiError && err.status === 400 ? "Password must be at least 10 characters." : "Something went wrong. Please try again."); } finally { setSubmitting(false); } }
  return <AuthLayout mode="signup" title="Create your account" subtitle="Start with a workspace for you and your team." footer={<p className="mt-7 mb-0 text-[14px] text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-primary underline decoration-primary/45 decoration-2 underline-offset-4 hover:text-[var(--primary-hover)]">Sign in</Link></p>}>
    <form onSubmit={onSubmit} className="flex flex-col gap-4"><div className="grid gap-1.5"><Label htmlFor="orgName" className="text-[13px] font-medium text-foreground">Organization name</Label><Input id="orgName" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." className={fieldClass} /></div><div className="grid gap-1.5"><Label htmlFor="email" className="text-[13px] font-medium text-foreground">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={fieldClass} /></div><div className="grid gap-1.5"><Label htmlFor="password" className="text-[13px] font-medium text-foreground">Create password</Label><Input id="password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" className={fieldClass} /></div>{error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}<Button type="submit" className="mt-2 h-12 w-full rounded-xl border-0 bg-primary text-[14px] font-semibold text-primary-foreground shadow-none hover:bg-[var(--primary-hover)]" disabled={submitting}>{submitting ? "Creating workspace…" : "Create workspace"}</Button></form>
  </AuthLayout>;
}

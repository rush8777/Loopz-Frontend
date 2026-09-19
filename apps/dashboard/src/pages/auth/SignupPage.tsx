import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import { AuthLayout } from "./AuthLayout";
import { Alert } from "@movecues/ui";
import { Button } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { Label } from "@movecues/ui";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ email, password, orgName });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with that email already exists.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("Password must be at least 10 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your workspace" subtitle="Set up your account and organization.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters"
          />
        </div>

        {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}

        <Button type="submit" className="mt-1 w-full" disabled={submitting}>
          {submitting ? "Creating workspace…" : "Create workspace"}
        </Button>
      </form>

      <p className="mt-5 mb-0 text-center text-[13px] text-muted-foreground">
        Already have a workspace?{" "}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

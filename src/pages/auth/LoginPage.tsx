import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to your workspace.">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 4 }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginTop: 20, marginBottom: 0 }}>
        Don't have a workspace?{" "}
        <Link to="/signup" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

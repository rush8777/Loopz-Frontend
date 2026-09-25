import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import * as teamApi from "../api/team";
import { setAccessToken, setRefreshToken, ApiError } from "../api/client";
import type { User } from "../types/api";

interface AuthContextValue {
  user: User | null;
  /** True only during the initial silent-refresh bootstrap on page load - not for subsequent actions. */
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { email: string; password: string; orgName: string; name?: string }) => Promise<void>;
  signupFromInvitation: (token: string, input: { name: string; password: string }) => Promise<{ orgId: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
      setBootstrapping(false);
      return;
    }
    // No stored access token (it's memory-only and lost on reload) - the
    // first authenticated request will 401 and the client's built-in
    // refresh-and-retry handles it transparently.
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setRefreshToken(null);
      })
      .finally(() => setBootstrapping(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (input: { email: string; password: string; orgName: string; name?: string }) => {
    const res = await authApi.signup(input);
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
  }, []);

  const signupFromInvitation = useCallback(async (token: string, input: { name: string; password: string }) => {
    const res = await teamApi.signupFromInvitation(token, input);
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
    return { orgId: res.membership.orgId };
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem("refreshToken");
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    if (token) {
      try {
        await authApi.logout(token);
      } catch (err) {
        // Already logged out locally - a failed server-side revoke isn't worth surfacing to the person leaving.
        if (!(err instanceof ApiError)) throw err;
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, bootstrapping, login, signup, signupFromInvitation, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

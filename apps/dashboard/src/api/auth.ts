import { apiRequest } from "./client";
import type { User, Org } from "../types/api";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function getGoogleClientConfig() {
  return apiRequest<{ clientId: string | null }>("/auth/google/config", { skipAuthRetry: true });
}

export function googleLogin(credential: string) {
  return apiRequest<AuthResponse & { org?: { id: string; name: string } }>("/auth/google", {
    method: "POST",
    body: { credential },
    skipAuthRetry: true,
  });
}

export function signup(input: { email: string; password: string; name?: string }) {
  return apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
}

export interface OnboardingState {
  complete: boolean;
  organization: { id: string; name: string } | null;
  site: { id: string; siteId: string; name: string; domain: string | null } | null;
}

export function getOnboarding() { return apiRequest<OnboardingState>("/auth/onboarding"); }
export function completeOnboarding(input: { workspaceName: string; siteName: string; domain: string }) {
  return apiRequest<Omit<OnboardingState, "complete">>("/auth/onboarding", { method: "POST", body: input });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", { method: "POST", body: input, skipAuthRetry: true });
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/auth/logout", { method: "POST", body: { refreshToken }, skipAuthRetry: true });
}

export function me() {
  return apiRequest<{ user: User; memberships: { orgId: string; role: string }[] }>("/auth/me");
}

export function listOrgs() {
  return apiRequest<{ organizations: Org[] }>("/orgs");
}

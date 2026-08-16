import { apiRequest } from "./client";
import type { User, Org } from "../types/api";

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function signup(input: { email: string; password: string; orgName: string; name?: string }) {
  return apiRequest<AuthResponse & { org: { id: string; name: string } }>("/auth/signup", {
    method: "POST",
    body: input,
    skipAuthRetry: true,
  });
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

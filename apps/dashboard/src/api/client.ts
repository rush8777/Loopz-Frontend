function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();

  // Local development remains zero-config. A production build must be given
  // an explicit API URL so it can never silently send credentials to localhost.
  if (!configured) {
    if (import.meta.env.DEV) return "http://localhost:3000";
    throw new Error("VITE_API_URL must be configured for production builds.");
  }

  // Cloudflare Pages variables are sometimes entered as a hostname. Normalize
  // that safe shorthand instead of producing a relative URL at runtime.
  const candidate = configured.includes("://") ? configured : `https://${configured}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("VITE_API_URL must be a valid absolute HTTP(S) URL.");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("VITE_API_URL must use HTTP or HTTPS.");
  if (import.meta.env.PROD && url.protocol !== "https:") {
    throw new Error("VITE_API_URL must use HTTPS in production.");
  }
  return url.origin + url.pathname.replace(/\/$/, "");
}

const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    const response = typeof body === "object" && body ? body as { error?: unknown; message?: unknown; details?: unknown } : null;
    const details = formatApiDetails(response?.details);
    const code = typeof response?.error === "string" ? response.error : null;
    super(
      typeof response?.message === "string" && response.message
        ? response.message
        : code && details ? `${code}: ${details}`
          : code ?? details ?? `HTTP ${status}`,
    );
    this.status = status;
    this.body = body;
  }
}

export interface EntitlementErrorBody {
  error: "resource_limit" | "feature_unavailable" | "subscription_inactive";
  entitlement?: {
    allowed?: false;
    reason?: string;
    planId?: "starter" | "growth" | "scale";
    resource?: string;
    feature?: string;
    current?: number;
    limit?: number;
    trialEndsAt?: string | null;
    upgradeRequired?: boolean;
  };
}

export function entitlementError(error: unknown): EntitlementErrorBody | null {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== "object") return null;
  const body = error.body as Partial<EntitlementErrorBody>;
  return body.error === "resource_limit" || body.error === "feature_unavailable" || body.error === "subscription_inactive"
    ? body as EntitlementErrorBody
    : null;
}

function formatApiDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const flattened = details as { formErrors?: unknown; fieldErrors?: unknown; issues?: unknown };
  const messages: string[] = [];
  if (Array.isArray(flattened.issues)) for (const issue of flattened.issues) {
    if (!issue || typeof issue !== "object") continue;
    const value = issue as { path?: unknown; message?: unknown };
    if (typeof value.message !== "string") continue;
    const path = Array.isArray(value.path) ? value.path.map(String).join(".") : "";
    messages.push(path ? `${path}: ${value.message}` : value.message);
  }
  if (Array.isArray(flattened.formErrors)) messages.push(...flattened.formErrors.filter((value): value is string => typeof value === "string"));
  if (flattened.fieldErrors && typeof flattened.fieldErrors === "object") {
    for (const [field, errors] of Object.entries(flattened.fieldErrors)) if (Array.isArray(errors)) for (const error of errors) if (typeof error === "string") messages.push(`${field}: ${error}`);
  }
  return messages.length ? [...new Set(messages)].join("; ") : JSON.stringify(details);
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}
export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem("refreshToken", token);
  else localStorage.removeItem("refreshToken");
}

/** Single-flight refresh: concurrent 401s during the same tick share one refresh call instead of racing. */
async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const token = getRefreshToken();
    if (!token) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) {
        setRefreshToken(null);
        return false;
      }
      const body = (await res.json()) as { accessToken: string; refreshToken: string };
      accessToken = body.accessToken;
      setRefreshToken(body.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();
  const result = await refreshInFlight;
  refreshInFlight = null;
  return result;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Set for the two auth endpoints that must not trigger a refresh-and-retry loop. */
  skipAuthRetry?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(API_URL + path);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const doFetch = () =>
    fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

  let res = await doFetch();

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // no JSON body - fine, ApiError falls back to the status code
    }
    const error = new ApiError(res.status, body);
    const entitlement = entitlementError(error);
    if (entitlement && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<EntitlementErrorBody>("movcues:upgrade-required", { detail: entitlement }));
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import { apiRequest } from "./client";

export interface PlanUsage {
  subscription: {
    planId: "starter" | "growth" | "scale";
    planName: string;
    status: "trialing" | "active" | "past_due" | "canceled" | "expired";
    active: boolean;
    trialEndsAt: string | null;
    currentPeriodStartsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    sites: number; members: number; dashboards: number; segments: number; funnels: number;
    publishedExperiences: number; monthlyActiveUsers: number;
    monthlyActiveUsersBySite: Array<{ siteId: string; monthlyActiveUsers: number }>;
  };
  limits: {
    site: number; member: number; dashboard: number; segment: number; funnel: number;
    published_experience: number; monthlyActiveUsers: number;
  };
  features: string[];
  billingConfigured: boolean;
  monthlyActiveUsers: { current: number; limit: number; percent: number; state: "ok" | "warning" | "over_limit"; softCap: true };
}

export function getPlanUsage(orgId: string) { return apiRequest<PlanUsage>(`/orgs/${orgId}/plan-usage`); }
export function createCheckout(orgId: string, planId: "starter" | "growth" | "scale") { return apiRequest<{ transactionId: string; checkoutUrl: string }>(`/orgs/${orgId}/billing/checkout`, { method: "POST", body: { planId } }); }
export function createPortalSession(orgId: string) { return apiRequest<{ url: string }>(`/orgs/${orgId}/billing/portal`, { method: "POST" }); }

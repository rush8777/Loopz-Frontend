import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@movecues/ui";
import { ArrowUpRight, Crown } from "lucide-react";
import { createCheckout, getPlanUsage, type PlanUsage } from "../../api/billing";
import type { EntitlementErrorBody } from "../../api/client";
import { useWorkspace } from "../../auth/WorkspaceContext";

const UpgradeContext = createContext({ showUpgrade: (_reason: EntitlementErrorBody) => {} });
export const useUpgradeNow = () => useContext(UpgradeContext);

const resourceLabels: Record<string, string> = {
  site: "sites", member: "team members", dashboard: "dashboards", segment: "segments", funnel: "funnels", published_experience: "published experiences",
};
const featureLabels: Record<string, string> = {
  advanced_audience_targeting: "combined audience targeting", custom_event_trigger: "custom-event triggers", manual_guide_launch: "manual guide launch",
  experience_scheduling: "experience scheduling", advanced_frequency: "advanced frequency controls", advanced_guide_progression: "advanced guide progression", experience_orchestration: "priority and interruption controls",
};

function titleFor(reason: EntitlementErrorBody) {
  if (reason.error === "subscription_inactive") return "Your trial has ended";
  if (reason.error === "feature_unavailable") return "Unlock this feature";
  return "You’ve reached your plan limit";
}
function descriptionFor(reason: EntitlementErrorBody) {
  const entitlement = reason.entitlement;
  if (reason.error === "subscription_inactive") return "Choose a plan to resume creating and publishing in this workspace. Your existing data is still safe.";
  if (reason.error === "feature_unavailable") return `${featureLabels[entitlement?.feature ?? ""] ?? "This capability"} is available on Growth and Scale.`;
  const resource = resourceLabels[entitlement?.resource ?? ""] ?? "this resource";
  const amount = entitlement?.current !== undefined && entitlement?.limit !== undefined ? ` You’re using ${entitlement.current} of ${entitlement.limit}.` : "";
  return `This workspace has used all available ${resource} on its current plan.${amount}`;
}

export function UpgradeNowProvider({ children }: { children: ReactNode }) {
  const { currentOrg } = useWorkspace();
  const [reason, setReason] = useState<EntitlementErrorBody | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const open = (event: Event) => setReason((event as CustomEvent<EntitlementErrorBody>).detail);
    window.addEventListener("movecues:upgrade-required", open);
    return () => window.removeEventListener("movecues:upgrade-required", open);
  }, []);
  useEffect(() => {
    if (!reason || !currentOrg) return;
    setUsage(null); setCheckoutError(null);
    getPlanUsage(currentOrg.orgId).then(setUsage).catch(() => undefined);
  }, [reason, currentOrg?.orgId]);

  const targetPlan = useMemo<"growth" | "scale">(() => {
    const plan = usage?.subscription.planId ?? reason?.entitlement?.planId;
    return plan === "growth" ? "scale" : "growth";
  }, [reason?.entitlement?.planId, usage?.subscription.planId]);
  const canBuy = usage?.billingConfigured && (currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN");

  async function upgrade() {
    if (!currentOrg) return;
    setLoading(true); setCheckoutError(null);
    try { const checkout = await createCheckout(currentOrg.orgId, targetPlan); window.location.assign(checkout.checkoutUrl); }
    catch { setCheckoutError("Couldn’t open checkout. Please try again or contact support."); setLoading(false); }
  }
  const showUpgrade = (next: EntitlementErrorBody) => setReason(next);

  return <UpgradeContext.Provider value={{ showUpgrade }}>
    {children}
    <Dialog open={Boolean(reason)} onOpenChange={(open) => !open && setReason(null)}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-5 py-5 pr-12">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Crown className="size-5" /></div>
          <DialogTitle className="text-[19px] tracking-[-0.02em]">{reason ? titleFor(reason) : "Upgrade your plan"}</DialogTitle>
          <DialogDescription className="text-[13px] leading-5">{reason ? descriptionFor(reason) : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-5">
          {usage && <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"><span>Current plan</span><Badge variant="outline">{usage.subscription.planName}</Badge></div>}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"><strong>{targetPlan === "growth" ? "Growth" : "Scale"}</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">{targetPlan === "growth" ? "Unlock advanced targeting, triggers, scheduling, and more capacity." : "Get higher limits across sites, people, analytics, and published experiences."}</p></div>
          {!canBuy && <p className="text-xs leading-5 text-muted-foreground">{currentOrg?.role === "MEMBER" || currentOrg?.role === "VIEWER" ? "Ask a workspace owner or admin to upgrade this plan." : "Checkout will be available once Paddle billing is configured for this workspace."}</p>}
          {checkoutError && <Alert className="border-destructive/25 bg-red-50 text-destructive">{checkoutError}</Alert>}
        </div>
        <DialogFooter className="border-t px-5 py-3"><Button variant="ghost" onClick={() => setReason(null)}>Not now</Button>{canBuy && <Button disabled={loading} onClick={() => void upgrade()}>{loading ? "Opening checkout…" : `Upgrade to ${targetPlan === "growth" ? "Growth" : "Scale"}`}<ArrowUpRight /></Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </UpgradeContext.Provider>;
}

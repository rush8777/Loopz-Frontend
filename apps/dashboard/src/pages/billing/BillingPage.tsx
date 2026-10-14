import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Badge, Button } from "@movcues/ui";
import { Check, CreditCard } from "lucide-react";
import { createCheckout, createPortalSession, getPlanUsage, type PlanUsage } from "../../api/billing";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { initializePaddleCheckout, openPaddleCheckout } from "../../lib/paddleCheckout";

type PlanId = "starter" | "growth" | "scale";

const plans: Array<{ id: PlanId; name: string; price: string; description: string; limits: string[] }> = [
  { id: "starter", name: "Starter", price: "$49", description: "For small teams building their first product journey.", limits: ["5,000 monthly active users", "1 site · 3 team members", "5 published experiences"] },
  { id: "growth", name: "Growth", price: "$129", description: "For teams that need more precise targeting and orchestration.", limits: ["15,000 monthly active users", "3 sites · 10 team members", "25 published experiences"] },
  { id: "scale", name: "Scale", price: "$299", description: "For larger product programs running across multiple sites.", limits: ["50,000 monthly active users", "10 sites · 30 team members", "100 published experiences"] },
];

export function BillingPage() {
  const { currentOrg } = useWorkspace();
  const [searchParams] = useSearchParams();
  const queryPlan = searchParams.get("plan");
  const preferredPlan: PlanId | undefined = queryPlan === "starter" || queryPlan === "growth" || queryPlan === "scale" ? queryPlan : undefined;
  const [data, setData] = useState<PlanUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<PlanId | "portal" | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    let active = true;
    setData(null); setError(null);
    getPlanUsage(currentOrg.orgId).then(result => { if (active) setData(result); }).catch(() => { if (active) setError("Couldn’t load plan usage."); });
    return () => { active = false; };
  }, [currentOrg?.orgId]);

  async function checkout(planId: PlanId) {
    if (!currentOrg) return;
    setWorking(planId); setError(null);
    try {
      await initializePaddleCheckout();
      const result = await createCheckout(currentOrg.orgId, planId);
      await openPaddleCheckout(result.transactionId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t start Paddle checkout."); setWorking(null); }
  }
  async function openPortal() {
    if (!currentOrg) return;
    setWorking("portal"); setError(null);
    try { const result = await createPortalSession(currentOrg.orgId); window.location.assign(result.url); }
    catch { setError("Couldn’t open the Paddle customer portal."); setWorking(null); }
  }

  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";
  const selectable = !data || ["trialing", "expired", "canceled"].includes(data.subscription.status);
  const percent = data ? Math.min(100, data.monthlyActiveUsers.percent) : 0;

  return <div className="mx-auto max-w-5xl pb-8">
    <header className="mb-7">
      <p className="text-sm font-medium text-primary">Billing</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Choose your plan</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose the plan that fits your workspace. Checkout is processed securely with Paddle.</p>
    </header>

    {error && <Alert className="mb-5 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}

    <section className="mb-7 grid gap-4 md:grid-cols-[1.35fr_.65fr]">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">CURRENT PLAN</p><h2 className="mt-1 text-lg font-semibold">{data?.subscription.planName ?? "Loading plan usage…"}</h2></div>{data && <Badge variant="outline" className="capitalize">{data.subscription.status.replaceAll("_", " ")}</Badge>}</div>
        {data && <><div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">{data.subscription.trialEndsAt ? "Trial ends" : "Subscription"}</p><p className="mt-1 text-sm font-medium">{data.subscription.trialEndsAt ? new Date(data.subscription.trialEndsAt).toLocaleDateString() : "Active"}</p></div><div><p className="text-xs text-muted-foreground">Monthly active users</p><p className="mt-1 text-sm font-medium">{data.monthlyActiveUsers.current.toLocaleString()} <span className="font-normal text-muted-foreground">of {data.monthlyActiveUsers.limit.toLocaleString()}</span></p></div></div><div className="mt-4 h-1.5 overflow-hidden rounded bg-muted"><div className={`h-full ${percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percent}%` }} /></div></>}
      </div>
      <aside className="rounded-lg border bg-card p-4"><CreditCard className="size-5 text-primary" /><h2 className="mt-3 text-sm font-semibold">Manage your subscription</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">View invoices, update payment details, or change an active plan in the Paddle customer portal.</p>{data?.billingConfigured && canManage && !selectable && <Button variant="outline" size="sm" className="mt-4 w-full" disabled={working !== null} onClick={() => void openPortal()}>{working === "portal" ? "Opening…" : "Manage billing"}</Button>}</aside>
    </section>

    <section><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold">Plans</h2><p className="mt-1 text-sm text-muted-foreground">All plans are billed monthly. You can change plans later.</p></div><span className="text-xs text-muted-foreground">MAU is a soft allowance</span></div>
      <div className="grid gap-3 lg:grid-cols-3">{plans.map(plan => {
        const featured = plan.id === "growth";
        const selected = preferredPlan === plan.id || (!preferredPlan && data?.subscription.planId === plan.id);
        const current = data?.subscription.planId === plan.id && !selectable;
        return <article key={plan.id} className={`flex min-h-80 flex-col rounded-lg border bg-card p-5 ${featured ? "border-primary" : ""}`}>
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{plan.name}</h3>{featured && <Badge>Popular</Badge>}</div>
          <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{plan.description}</p>
          <p className="mt-5 text-2xl font-semibold tracking-tight">{plan.price}<span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span></p>
          <ul className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">{plan.limits.map(limit => <li key={limit} className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{limit}</li>)}</ul>
          {data?.billingConfigured && canManage && selectable ? <Button size="sm" variant={featured || selected ? "default" : "outline"} className="mt-auto w-full" disabled={working !== null} onClick={() => void checkout(plan.id)}>{working === plan.id ? "Opening…" : `Choose ${plan.name}`}</Button> : <div className="mt-auto text-center text-sm text-muted-foreground">{current ? "Current plan" : "Plan selection unavailable"}</div>}
        </article>;
      })}</div>
      {!canManage && data?.billingConfigured && <p className="mt-4 text-sm text-muted-foreground">Ask a workspace owner or admin to make billing changes.</p>}
    </section>
  </div>;
}

import { useSearchParams } from "react-router-dom";
import { PlanUsageSettings } from "../../components/settings/PlanUsageSettings";

const planLabels = { starter: "Starter", growth: "Growth", scale: "Scale" } as const;

export function BillingPage() {
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const preferredPlan = requestedPlan === "starter" || requestedPlan === "growth" || requestedPlan === "scale" ? requestedPlan : undefined;

  return <div className="mx-auto max-w-3xl">
    <div className="mb-7">
      <p className="text-sm font-medium text-primary">Billing</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Choose your plan</h1>
      <p className="mt-2 text-sm text-muted-foreground">{preferredPlan ? `${planLabels[preferredPlan]} is selected below. Confirm your plan in Paddle Checkout.` : "Choose a plan and complete checkout securely with Paddle."}</p>
    </div>
    <PlanUsageSettings preferredPlan={preferredPlan} />
  </div>;
}

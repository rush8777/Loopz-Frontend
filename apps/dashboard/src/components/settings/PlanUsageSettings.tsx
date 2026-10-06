import { useEffect, useState } from "react";
import { Alert, Badge, Button } from "@movcues/ui";
import { createCheckout, createPortalSession, getPlanUsage, type PlanUsage } from "../../api/billing";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

const labels = {
  sites: "Sites", members: "Members", dashboards: "Dashboards", segments: "Segments",
  funnels: "Funnels", publishedExperiences: "Published experiences",
} as const;

export function PlanUsageSettings() {
  const { currentOrg } = useWorkspace(); const [data, setData] = useState<PlanUsage | null>(null);
  const [error, setError] = useState(false); const [actionError, setActionError] = useState<string | null>(null); const [working, setWorking] = useState<string | null>(null);
  useEffect(() => {
    if (!currentOrg) return;
    let active = true; setData(null); setError(false);
    getPlanUsage(currentOrg.orgId).then(value => { if (active) setData(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [currentOrg?.orgId]);

  async function checkout(planId: "starter" | "growth" | "scale") {
    if (!currentOrg) return; setWorking(planId); setActionError(null);
    try { const result = await createCheckout(currentOrg.orgId, planId); window.location.assign(result.checkoutUrl); }
    catch { setActionError("Couldn't start Paddle checkout."); setWorking(null); }
  }
  async function portal() {
    if (!currentOrg) return; setWorking("portal"); setActionError(null);
    try { const result = await createPortalSession(currentOrg.orgId); window.location.assign(result.url); }
    catch { setActionError("Couldn't open the Paddle customer portal."); setWorking(null); }
  }

  return <div>
    <SettingsHeading title="Plan & Usage" description="See this workspace's plan, trial, and current capacity." />
    {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">Couldn&apos;t load plan usage.</Alert>}
    {!data && !error && <p className="text-sm text-muted-foreground">Loading plan usage…</p>}
    {data && <>
      {data.monthlyActiveUsers.state !== "ok" && <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-950">
        {data.monthlyActiveUsers.state === "warning" ? "You have used at least 80% of this month's MAU allowance." : "This workspace is over its MAU allowance. Data collection continues without interruption; upgrade is requested."}
      </Alert>}
      <SettingsGroup title="Subscription">
        <SettingsRow label="Plan" value={<span className="flex items-center gap-2"><strong>{data.subscription.planName}</strong><Badge variant="outline">{data.subscription.status.replaceAll("_", " ")}</Badge></span>} />
        {data.subscription.trialEndsAt && <SettingsRow label="Trial ends" value={new Date(data.subscription.trialEndsAt).toLocaleDateString()} />}
      </SettingsGroup>
      {actionError && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{actionError}</Alert>}
      {data.billingConfigured && (currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN") && <SettingsGroup title="Billing">
        <div className="flex flex-wrap gap-2 p-3.5">
          {(["starter", "growth", "scale"] as const).map(planId => <Button key={planId} type="button" variant={data.subscription.planId === planId ? "outline" : "default"} size="sm" disabled={working !== null} onClick={() => void checkout(planId)}>{working === planId ? "Opening…" : `Choose ${planId[0].toUpperCase() + planId.slice(1)}`}</Button>)}
          {data.subscription.status !== "trialing" && <Button type="button" variant="outline" size="sm" disabled={working !== null} onClick={() => void portal()}>{working === "portal" ? "Opening…" : "Manage billing"}</Button>}
        </div>
      </SettingsGroup>}
      <SettingsGroup title="Monthly active users">
        <UsageRow label="MAU" current={data.monthlyActiveUsers.current} limit={data.monthlyActiveUsers.limit} soft />
      </SettingsGroup>
      <SettingsGroup title="Capacity">
        {(Object.keys(labels) as Array<keyof typeof labels>).map(key => {
          const limitKey = key === "sites" ? "site" : key === "members" ? "member" : key === "dashboards" ? "dashboard" : key === "segments" ? "segment" : key === "funnels" ? "funnel" : "published_experience";
          return <UsageRow key={key} label={labels[key]} current={data.usage[key]} limit={data.limits[limitKey]} />;
        })}
      </SettingsGroup>
      <p className="text-xs leading-5 text-muted-foreground">MAU is a soft allowance: collection and existing experience delivery are never stopped because usage crosses the monthly threshold.</p>
    </>}
  </div>;
}

function UsageRow({ label, current, limit, soft = false }: { label: string; current: number; limit: number; soft?: boolean }) {
  const percent = Math.min(100, limit ? current / limit * 100 : 0);
  return <SettingsRow label={label} value={<div className="min-w-48"><div className="mb-1 flex justify-between gap-4"><span>{current.toLocaleString()} of {limit.toLocaleString()}</span>{soft && <span className="text-xs text-muted-foreground">soft cap</span>}</div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percent}%` }} /></div></div>} />;
}

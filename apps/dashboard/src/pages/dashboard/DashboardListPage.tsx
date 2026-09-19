import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/auth/WorkspaceContext";
import * as dashboardsApi from "@/api/dashboards";
import { Button } from "@movecues/ui";
import { EmptyState } from "@/components/EmptyState";
import { ErrorNotice, LoadingRows } from "@/components/PageSurface";
import { PageHeader } from "@/components/PageHeader";
import type { DashboardSummary } from "@/types/api";

export function DashboardListPage() {
  const { currentOrg, currentSite, loading: workspaceLoading } = useWorkspace(); const navigate = useNavigate(); const [items, setItems] = useState<DashboardSummary[]>(); const [error, setError] = useState<string>(); const canEdit = currentOrg?.role === "ADMIN" || currentOrg?.role === "OWNER";
  const load = useCallback(() => { if (!currentOrg || !currentSite) return; setItems(undefined); setError(undefined); dashboardsApi.listDashboards(currentOrg.orgId, currentSite.id).then((r) => setItems(r.dashboards)).catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboards.")); }, [currentOrg, currentSite]);
  useEffect(load, [load]);
  async function remove(item: DashboardSummary) { if (!currentOrg || !currentSite || !window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return; await dashboardsApi.deleteDashboard(currentOrg.orgId, currentSite.id, item.id); load(); }
  return <div><PageHeader section="Workspace" title="Dashboards" description="Reusable product analytics for this site." actions={canEdit ? <Button onClick={() => navigate("/dashboard/new")}><Plus />New dashboard</Button> : undefined} />
    {!currentSite && !workspaceLoading ? <EmptyState icon={<LayoutDashboard />} title="Select a site" description="Choose a site in workspace settings to view its dashboards." /> : error ? <ErrorNotice>{error} <Button size="sm" variant="outline" onClick={load}>Retry</Button></ErrorNotice> : !items ? <LoadingRows /> : !items.length ? <EmptyState icon={<LayoutDashboard />} title="No dashboards yet" description="Create a dashboard to combine Metrics, Funnels, and Retention." action={canEdit ? <Button className="mt-3" onClick={() => navigate("/dashboard/new")}><Plus />Create dashboard</Button> : undefined} /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.id} className="group rounded-lg border bg-card p-5 shadow-sm"><button className="w-full text-left" onClick={() => navigate(`/dashboard/${item.id}`)}><h2 className="font-semibold">{item.name}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{item.description || "No description"}</p><div className="mt-4 text-xs text-muted-foreground">{item.cardCount} card{item.cardCount === 1 ? "" : "s"} · Updated {new Date(item.updatedAt).toLocaleDateString()}</div></button>{canEdit && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/${item.id}/edit`)}>Edit</Button><Button size="icon" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)}><Trash2 /></Button></div>}</div>)}</div>}
  </div>;
}

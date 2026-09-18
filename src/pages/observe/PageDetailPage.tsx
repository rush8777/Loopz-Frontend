import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { AnalyticsMetricCard } from "@/components/analytics/AnalyticsMetricCard";
import { EmptyState } from "../../components/EmptyState";
import { ElementsTable, mergeElementMetadata } from "../../components/elements/ElementsTable";
import * as pagesApi from "../../api/pages";
import type { CatalogElement, HeatmapIndexRow, PageDetail, PageElement, PageRuleOperator } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableFrame, ErrorNotice, dataTableClass } from "@/components/PageSurface";

const OPERATOR_LABEL: Record<PageRuleOperator, string> = {
  equals: "is exactly",
  starts_with: "starts with",
  ends_with: "ends with",
  contains: "contains",
  matches_pattern: "matches pattern",
};

function Overview({ page }: { page: PageDetail }) {
  return (
    <>
      <section className="mb-5 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Rules</h2>
        <div className="space-y-2">
          {page.rules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center gap-2 text-[13px]">
              <Badge variant={rule.kind === "include" ? "secondary" : "outline"} className="uppercase">{rule.kind}</Badge>
              <span className="text-muted-foreground">Path {OPERATOR_LABEL[rule.operator]}</span>
              <code className="mono break-all text-foreground">{rule.value}</code>
            </div>
          ))}
        </div>
        {(page.area || page.pageType) && <div className="mt-4 border-t pt-4 text-xs text-muted-foreground">{page.area && <div>Area: {page.area}</div>}{page.pageType && <div>Type: {page.pageType}</div>}</div>}
      </section>
      <DataTableFrame>
        <div className="border-b px-4 py-3 text-sm font-semibold">Matched URLs</div>
        {page.matchedPaths.length === 0 ? <EmptyState title="No traffic matched yet" description="No recorded page views currently satisfy these rules." /> : (
          <table className={dataTableClass}><thead><tr><th>URL</th><th>Views</th><th>Last seen</th></tr></thead><tbody>
            {page.matchedPaths.map((match) => <tr key={match.pagePath}><td className="mono max-w-lg break-all text-foreground">{match.pagePath}</td><td className="mono">{match.views.toLocaleString()}</td><td className="text-muted-foreground" title={formatTimestamp(match.lastSeenAt)}>{formatRelativeTime(match.lastSeenAt)}</td></tr>)}
          </tbody></table>
        )}
      </DataTableFrame>
    </>
  );
}

export function PageDetailPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<PageDetail | null>(null);
  const [elements, setElements] = useState<PageElement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapIndexRow | null>(null);
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"overview" | "elements">(requestedTab === "elements" ? "elements" : "overview");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    setPage(null);
    setError(null);
    pagesApi.getPage(currentOrg.orgId, currentSite.id, pageId).then(setPage).catch(() => setError("Couldn't load this page."));
  }, [currentOrg, currentSite, pageId]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    pagesApi.listHeatmaps(currentOrg.orgId, currentSite.id).then(({ heatmaps }) => setHeatmap(heatmaps.find((item) => item.id === pageId) ?? null)).catch(() => setHeatmap(null));
  }, [currentOrg, currentSite, pageId]);

  useEffect(() => {
    if (requestedTab === "heatmap" && pageId) navigate(`/observe/heatmaps/${pageId}`, { replace: true });
  }, [requestedTab, pageId, navigate]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    setElements(null);
    setElementsError(null);
    pagesApi.listPageElements(currentOrg.orgId, currentSite.id, pageId).then((result) => setElements(result.elements)).catch(() => setElementsError("Couldn't load page elements."));
  }, [currentOrg, currentSite, pageId]);

  function patchElement(updated: CatalogElement) {
    setElements((current) => current?.map((element) => element.id === updated.id ? { ...mergeElementMetadata(element, updated), matchedPaths: element.matchedPaths } : element) ?? current);
  }

  async function handleDelete() {
    if (!currentOrg || !currentSite || !pageId || !window.confirm("Delete this page? Its rules will be removed, but nothing happens to the underlying traffic data.")) return;
    setDeleting(true);
    try {
      await pagesApi.deletePage(currentOrg.orgId, currentSite.id, pageId);
      navigate("/observe/pages");
    } catch {
      setError("Couldn't delete this page.");
      setDeleting(false);
    }
  }

  if (error) return <><PageHeader section="Observe" title="Page" /><ErrorNotice>{error}</ErrorNotice></>;
  if (!page) return <><PageHeader section="Observe" title="Page" /><Skeleton className="h-52 w-full" /></>;

  return (
    <>
      <PageHeader section="Observe" title={page.name} description={page.description ?? page.rules.map((rule) => rule.value).join(", ")}
        actions={<div className="flex gap-2"><Button variant="outline" onClick={() => navigate(`/observe/pages/${page.id}/edit`)}>Edit</Button><Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button></div>} />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard label="Views" value={page.views.toLocaleString()} description="Total matching page views" />
        <AnalyticsMetricCard label="Unique visitors" value={page.uniqueVisitors.toLocaleString()} description="Distinct visitors who matched these rules" />
        <AnalyticsMetricCard label="Sessions" value={page.uniqueSessions.toLocaleString()} description="Sessions containing a matching page view" />
        <AnalyticsMetricCard label="Last seen" value={page.lastSeenAt ? formatRelativeTime(page.lastSeenAt) : "—"} description="Most recent matching page view" />
      </div>
      <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4" aria-label="Heatmap status">
        <div><h2 className="text-sm font-semibold">Heatmap</h2><div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{page.heatmapEnabled ? "Active" : "Disabled"}</span><span>{(heatmap?.interactions ?? 0).toLocaleString()} interactions</span><span>{heatmap?.referenceCapturedAt ? `Reference updated ${formatRelativeTime(heatmap.referenceCapturedAt)}` : "Reference capture pending"}</span></div></div>
        <Button onClick={() => navigate(`/observe/heatmaps/${page.id}`)}>Open heatmap</Button>
      </section>
      <div role="tablist" aria-label="Page detail" className="mb-4 flex gap-1 overflow-x-auto border-b">
        {(["overview", "elements"] as const).map((tab) => <Button key={tab} role="tab" aria-selected={activeTab === tab} variant="ghost" className={`rounded-b-none border-b-2 capitalize ${activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => { setActiveTab(tab); setSearchParams(tab === "overview" ? {} : { tab }, { replace: true }); }}>{tab}</Button>)}
      </div>
      {activeTab === "overview" && <Overview page={page} />}
      {activeTab === "elements" && <ElementsTable elements={elements} error={elementsError} onUpdated={patchElement} emptyDescription="No discovered elements have been reported from URLs matching this Page's current rules." />}
    </>
  );
}

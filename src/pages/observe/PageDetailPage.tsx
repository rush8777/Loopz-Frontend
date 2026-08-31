import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { ElementsTable, mergeElementMetadata } from "../../components/elements/ElementsTable";
import * as pagesApi from "../../api/pages";
import type { CatalogElement, PageDetail, PageElement, PageRuleOperator } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { PageHeatmapTab } from "./PageHeatmapTab";

const OPERATOR_LABEL: Record<PageRuleOperator, string> = {
  equals: "is exactly",
  starts_with: "starts with",
  ends_with: "ends with",
  contains: "contains",
  matches_pattern: "matches pattern",
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return <div className="card card-padded" style={{ flex: 1 }}><div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div></div>;
}

function Overview({ page }: { page: PageDetail }) {
  return (
    <>
      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Rules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {page.rules.map((rule) => (
            <div key={rule.id} style={{ fontSize: 12.5, display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`badge ${rule.kind === "include" ? "badge-observe" : "badge-neutral"}`} style={{ fontSize: 10, textTransform: "uppercase" }}>{rule.kind}</span>
              <span style={{ color: "var(--text-secondary)" }}>Path {OPERATOR_LABEL[rule.operator]}</span>
              <code className="mono" style={{ color: "var(--text-primary)" }}>{rule.value}</code>
            </div>
          ))}
        </div>
        {(page.area || page.pageType) && <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-secondary)" }}>{page.area && <div>Area: {page.area}</div>}{page.pageType && <div>Type: {page.pageType}</div>}</div>}
      </div>
      <div className="card">
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 13.5, borderBottom: "1px solid var(--border)" }}>Matched URLs</div>
        {page.matchedPaths.length === 0 ? <EmptyState title="No traffic matched yet" description="No recorded page views currently satisfy these rules." /> : (
          <table className="table"><thead><tr><th>URL</th><th>Views</th><th>Last seen</th></tr></thead><tbody>
            {page.matchedPaths.map((match) => <tr key={match.pagePath}><td className="mono" style={{ color: "var(--text-primary)" }}>{match.pagePath}</td><td className="mono">{match.views.toLocaleString()}</td><td style={{ color: "var(--text-secondary)" }} title={formatTimestamp(match.lastSeenAt)}>{formatRelativeTime(match.lastSeenAt)}</td></tr>)}
          </tbody></table>
        )}
      </div>
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
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"overview" | "elements" | "heatmap">(requestedTab === "heatmap" ? "heatmap" : requestedTab === "elements" ? "elements" : "overview");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    setPage(null);
    setError(null);
    pagesApi.getPage(currentOrg.orgId, currentSite.id, pageId).then(setPage).catch(() => setError("Couldn't load this page."));
  }, [currentOrg, currentSite, pageId]);

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

  if (error) return <><PageHeader section="Observe" title="Page" /><div className="card"><div style={{ padding: 16 }}><div className="error-banner">{error}</div></div></div></>;
  if (!page) return <><PageHeader section="Observe" title="Page" /><div className="card" style={{ padding: 16 }}><div className="skeleton" style={{ height: 200 }} /></div></>;

  return (
    <>
      <PageHeader section="Observe" title={page.name} description={page.description ?? page.rules.map((rule) => rule.value).join(", ")}
        actions={<div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost" onClick={() => navigate(`/observe/pages/${page.id}/edit`)}>Edit</button><button className="btn btn-ghost" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button></div>} />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Views" value={page.views.toLocaleString()} /><MetricCard label="Unique visitors" value={page.uniqueVisitors.toLocaleString()} /><MetricCard label="Sessions" value={page.uniqueSessions.toLocaleString()} /><MetricCard label="Last seen" value={page.lastSeenAt ? formatRelativeTime(page.lastSeenAt) : "—"} />
      </div>
      <div role="tablist" aria-label="Page detail" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {(["overview", "elements", "heatmap"] as const).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={`btn ${activeTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => { setActiveTab(tab); setSearchParams(tab === "overview" ? {} : { tab }, { replace: true }); }} style={{ textTransform: "capitalize", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>{tab}</button>)}
      </div>
      {activeTab === "overview" && <Overview page={page} />}
      {activeTab === "elements" && <ElementsTable elements={elements} error={elementsError} onUpdated={patchElement} emptyDescription="No discovered elements have been reported from URLs matching this Page's current rules." />}
      {activeTab === "heatmap" && <PageHeatmapTab page={page} onPageChange={setPage} />}
    </>
  );
}

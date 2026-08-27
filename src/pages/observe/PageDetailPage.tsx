import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as pagesApi from "../../api/pages";
import type { PageDetail, PageRuleOperator } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";

const OPERATOR_LABEL: Record<PageRuleOperator, string> = {
  equals: "is exactly",
  starts_with: "starts with",
  ends_with: "ends with",
  contains: "contains",
  matches_pattern: "matches pattern",
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card card-padded" style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export function PageDetailPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite || !pageId) return;
    setPage(null);
    setError(null);
    pagesApi
      .getPage(currentOrg.orgId, currentSite.id, pageId)
      .then(setPage)
      .catch(() => setError("Couldn't load this page."));
  }, [currentOrg, currentSite, pageId]);

  async function handleDelete() {
    if (!currentOrg || !currentSite || !pageId) return;
    if (!window.confirm("Delete this page? Its rules will be removed, but nothing happens to the underlying traffic data.")) return;
    setDeleting(true);
    try {
      await pagesApi.deletePage(currentOrg.orgId, currentSite.id, pageId);
      navigate("/observe/pages");
    } catch {
      setError("Couldn't delete this page.");
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader section="Observe" title="Page" />
        <div className="card">
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        </div>
      </>
    );
  }

  if (!page) {
    return (
      <>
        <PageHeader section="Observe" title="Page" />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title={page.name}
        description={page.description ?? undefined}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/observe/pages/${page.id}/edit`)}>
              Edit
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard label="Views" value={page.views.toLocaleString()} />
        <MetricCard label="Unique visitors" value={page.uniqueVisitors.toLocaleString()} />
        <MetricCard label="Sessions" value={page.uniqueSessions.toLocaleString()} />
        <MetricCard label="Last seen" value={page.lastSeenAt ? formatRelativeTime(page.lastSeenAt) : "—"} />
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Rules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {page.rules.map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, display: "flex", gap: 8, alignItems: "center" }}>
              <span
                className={`badge ${r.kind === "include" ? "badge-observe" : "badge-neutral"}`}
                style={{ fontSize: 10, textTransform: "uppercase" }}
              >
                {r.kind}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>Path {OPERATOR_LABEL[r.operator]}</span>
              <code className="mono" style={{ color: "var(--text-primary)" }}>
                {r.value}
              </code>
            </div>
          ))}
        </div>
        {(page.area || page.pageType) && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-secondary)" }}>
            {page.area && <div>Area: {page.area}</div>}
            {page.pageType && <div>Type: {page.pageType}</div>}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 13.5, borderBottom: "1px solid var(--border)" }}>
          Matched URLs
        </div>
        {page.matchedPaths.length === 0 ? (
          <EmptyState title="No traffic matched yet" description="No recorded page views currently satisfy these rules." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Views</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {page.matchedPaths.map((m) => (
                <tr key={m.pagePath}>
                  <td className="mono" style={{ color: "var(--text-primary)" }}>
                    {m.pagePath}
                  </td>
                  <td className="mono">{m.views.toLocaleString()}</td>
                  <td style={{ color: "var(--text-secondary)" }} title={formatTimestamp(m.lastSeenAt)}>
                    {formatRelativeTime(m.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

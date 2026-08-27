import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as pagesApi from "../../api/pages";
import type { PageDefinition, UntaggedUrl } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";

type Tab = "overview" | "untagged";

export function PagesPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const [pages, setPages] = useState<PageDefinition[] | null>(null);
  const [untagged, setUntagged] = useState<UntaggedUrl[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!currentOrg || !currentSite) return;
    setError(null);
    setPages(null);
    setUntagged(null);
    pagesApi
      .listPages(currentOrg.orgId, currentSite.id)
      .then((res) => setPages(res.pages))
      .catch(() => setError("Couldn't load pages."));
    pagesApi
      .listUntaggedUrls(currentOrg.orgId, currentSite.id)
      .then((res) => setUntagged(res.untagged))
      .catch(() => setError("Couldn't load untagged URLs."));
  }

  useEffect(reload, [currentOrg, currentSite]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Pages" description="Organize the raw URLs your app generates into logical pages." />
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title="Pages"
        description="Group the URLs your app generates into logical pages, so patterns, heatmaps, and replay can target them by name instead of raw paths."
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/observe/pages/new")}>
            + Create Page
          </button>
        }
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview{pages ? ` (${pages.length})` : ""}
        </TabButton>
        <TabButton active={tab === "untagged"} onClick={() => setTab("untagged")}>
          Untagged URLs{untagged ? ` (${untagged.length})` : ""}
        </TabButton>
      </div>

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}

        {!error && tab === "overview" && <OverviewTab pages={pages} onOpen={(id) => navigate(`/observe/pages/${id}`)} />}
        {!error && tab === "untagged" && (
          <UntaggedTab
            untagged={untagged}
            onTag={(pagePath) => navigate(`/observe/pages/new?path=${encodeURIComponent(pagePath)}`)}
          />
        )}
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ghost btn-sm"
      style={{
        borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
        borderBottom: active ? "2px solid var(--observe)" : "2px solid transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function OverviewTab({ pages, onOpen }: { pages: PageDefinition[] | null; onOpen: (id: string) => void }) {
  if (pages === null) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <EmptyState
        title="No pages tagged yet"
        description="Create a Page to group raw URLs (like every /products/:id path) into one named, trackable page - or start from the Untagged URLs tab to see what traffic exists first."
      />
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Area</th>
          <th>Rules</th>
          <th>Views</th>
          <th>Visitors</th>
          <th>Sessions</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p) => (
          <tr key={p.id} onClick={() => onOpen(p.id)}>
            <td style={{ color: "var(--text-primary)" }}>
              {p.name}
              {p.pageType && (
                <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>
                  {p.pageType}
                </span>
              )}
            </td>
            <td style={{ color: "var(--text-secondary)" }}>{p.area ?? "—"}</td>
            <td className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {p.rules.length} rule{p.rules.length === 1 ? "" : "s"}
            </td>
            <td className="mono">{p.views.toLocaleString()}</td>
            <td className="mono">{p.uniqueVisitors.toLocaleString()}</td>
            <td className="mono">{p.uniqueSessions.toLocaleString()}</td>
            <td style={{ color: "var(--text-secondary)" }}>{p.lastSeenAt ? formatRelativeTime(p.lastSeenAt) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UntaggedTab({ untagged, onTag }: { untagged: UntaggedUrl[] | null; onTag: (pagePath: string) => void }) {
  if (untagged === null) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  if (untagged.length === 0) {
    return (
      <EmptyState
        title="Nothing untagged"
        description="Every URL this site has recorded a page view for is covered by at least one Page's rules."
      />
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>URL</th>
          <th>Views</th>
          <th>Last seen</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {untagged.map((u) => (
          <tr key={u.pagePath}>
            <td className="mono" style={{ color: "var(--text-primary)" }}>
              {u.pagePath}
            </td>
            <td className="mono">{u.views.toLocaleString()}</td>
            <td style={{ color: "var(--text-secondary)" }}>{formatRelativeTime(u.lastSeenAt)}</td>
            <td>
              <button className="btn btn-ghost btn-sm" onClick={() => onTag(u.pagePath)}>
                Tag URL
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

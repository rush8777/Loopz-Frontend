import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as pagesApi from "../../api/pages";
import type { PageDefinition, UntaggedUrl } from "../../types/api";
import { formatRelativeTime } from "../../lib/format";
import { Plus } from "lucide-react";
import { Button } from "@movecues/ui";
import { DataTableFrame, ErrorNotice, FilterToolbar, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { cn } from "@movecues/ui";
import { AnalyticsFilterBar, type AppliedFilters, type FilterDefinition } from "@/components/filters/AnalyticsFilterBar";
import { readFilters, writeFilters } from "@/components/filters/filterUrlState";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";

type Tab = "overview" | "untagged";

export function PagesPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = searchParams.toString();
  const [tab, setTab] = useState<Tab>("overview");

  const [pages, setPages] = useState<PageDefinition[] | null>(null);
  const [untagged, setUntagged] = useState<UntaggedUrl[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filters = readFilters(searchParams, ["range", "pageType"]);
  const range = resolveDateRange((filters.range?.[0] ?? "30d") as DateRangePreset);
  const sort = searchParams.get("sort") ?? "views";
  const definitions: FilterDefinition[] = [{ key: "range", label: "Date range", options: [{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }] }, { key: "pageType", label: "Page type", options: ["landing", "marketing", "dashboard", "list", "detail", "settings", "checkout", "authentication", "pricing", "documentation", "other"].map((value) => ({ value, label: value.replace("_", " ") })) }];

  function reload() {
    if (!currentOrg || !currentSite) return;
    setError(null);
    setPages(null);
    setUntagged(null);
    pagesApi
      .listPages(currentOrg.orgId, currentSite.id, { since: range?.since, until: range?.until, pageType: filters.pageType?.[0], sort })
      .then((res) => setPages(res.pages))
      .catch(() => setError("Couldn't load pages."));
    pagesApi
      .listUntaggedUrls(currentOrg.orgId, currentSite.id)
      .then((res) => setUntagged(res.untagged))
      .catch(() => setError("Couldn't load untagged URLs."));
  }

  useEffect(reload, [currentOrg, currentSite, filterQuery]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Pages" description="Organize the raw URLs your app generates into logical pages." />
        <DataTableFrame>
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </DataTableFrame>
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
          <Button onClick={() => navigate("/observe/pages/new")}><Plus />Create Page</Button>
        }
      />

      <FilterToolbar className="justify-start gap-1">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview{pages ? ` (${pages.length})` : ""}
        </TabButton>
        <TabButton active={tab === "untagged"} onClick={() => setTab("untagged")}>
          Untagged URLs{untagged ? ` (${untagged.length})` : ""}
        </TabButton>
      </FilterToolbar>

      {tab === "overview" && <AnalyticsFilterBar definitions={definitions} values={filters} onChange={(next: AppliedFilters) => setSearchParams(writeFilters(searchParams, next, definitions.map((item) => item.key)), { replace: true })} sort={sort} onSortChange={(value) => { const next = new URLSearchParams(searchParams); next.set("sort", value); setSearchParams(next, { replace: true }); }} sortOptions={[{ value: "views", label: "Views" }, { value: "visitors", label: "Visitors" }, { value: "sessions", label: "Sessions" }, { value: "lastSeen", label: "Last seen" }, { value: "az", label: "A–Z" }, { value: "za", label: "Z–A" }]} />}

      <DataTableFrame>
        {error && (
          <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>
        )}

        {!error && tab === "overview" && <OverviewTab pages={pages} onOpen={(id) => navigate(`/observe/pages/${id}`)} />}
        {!error && tab === "untagged" && (
          <UntaggedTab
            untagged={untagged}
            onTag={(pagePath) => navigate(`/observe/pages/new?path=${encodeURIComponent(pagePath)}`)}
          />
        )}
      </DataTableFrame>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={cn("rounded-b-none border-b-2 border-transparent text-muted-foreground", active && "border-primary font-semibold text-foreground")}
    >
      {children}
    </Button>
  );
}

function OverviewTab({ pages, onOpen }: { pages: PageDefinition[] | null; onOpen: (id: string) => void }) {
  if (pages === null) {
    return (
      <LoadingRows count={4} />
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
    <table className={dataTableClass}>
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
            <td className="font-medium text-foreground">
              {p.name}
              {p.pageType && (
                <span className="ml-2 inline-flex rounded-sm border px-1.5 text-[10px] font-medium text-muted-foreground">
                  {p.pageType}
                </span>
              )}
            </td>
            <td className="text-muted-foreground">{p.area ?? "—"}</td>
            <td className="mono text-xs text-muted-foreground">
              {p.rules.length} rule{p.rules.length === 1 ? "" : "s"}
            </td>
            <td className="mono">{p.views.toLocaleString()}</td>
            <td className="mono">{p.uniqueVisitors.toLocaleString()}</td>
            <td className="mono">{p.uniqueSessions.toLocaleString()}</td>
            <td className="text-muted-foreground">{p.lastSeenAt ? formatRelativeTime(p.lastSeenAt) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UntaggedTab({ untagged, onTag }: { untagged: UntaggedUrl[] | null; onTag: (pagePath: string) => void }) {
  if (untagged === null) {
    return (
      <LoadingRows count={4} />
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
    <table className={dataTableClass}>
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
            <td className="mono max-w-md break-all text-foreground">
              {u.pagePath}
            </td>
            <td className="mono">{u.views.toLocaleString()}</td>
            <td className="text-muted-foreground">{formatRelativeTime(u.lastSeenAt)}</td>
            <td>
              <Button variant="ghost" size="sm" onClick={() => onTag(u.pagePath)}>
                Tag URL
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

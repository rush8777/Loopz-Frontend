import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import * as segmentsApi from "../../api/segments";
import * as pagesApi from "../../api/pages";
import type { SessionSummary } from "../../types/api";
import { formatDuration, formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Button } from "@/components/ui/button";
import { BrowserIcon } from "../../components/BrowserIcon";
import { AnalyticsFilterBar, type AppliedFilters, type FilterDefinition } from "@/components/filters/AnalyticsFilterBar";
import { readFilters, writeFilters } from "@/components/filters/filterUrlState";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRange";
import { DataTableFrame, ErrorNotice, LoadingRows } from "@/components/PageSurface";

const PAGE_SIZE = 25;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function SessionRow({ session, onOpen }: { session: SessionSummary; onOpen: () => void }) {
  const visitor = session.visitor; const label = visitor?.label ?? "Unresolved visitor";
  const browser = session.browserName || "Not recorded";
  const device = [session.osName, session.deviceType].filter(Boolean).join(" · ");
  const initial = label.charAt(0).toUpperCase() || "?";
  return <div className="grid cursor-pointer gap-3 border-b px-4 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(180px,1.3fr)_100px_minmax(190px,1fr)_minmax(125px,.8fr)_90px_auto] md:items-center" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }}>
    <div className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">{initial}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{visitor ? `${visitor.type} visitor` : "Visitor unavailable"}{session.hasReplay ? " · Replay available" : ""}</span></span></div>
    <span className="mono text-sm">{formatDuration(session.durationMs)}</span><span className="text-sm text-muted-foreground">{plural(session.pageVisitCount ?? 0, "page")} · {plural(session.clickCount ?? 0, "click")} · {plural(session.customEventCount ?? 0, "event")}</span><span className="min-w-0 text-sm text-muted-foreground"><span className="flex min-w-0 items-center gap-2"><BrowserIcon name={session.browserName} /><span className="truncate">{browser}</span></span>{device && <span className="mt-0.5 block truncate text-xs">{device}</span>}</span><time className="text-sm text-muted-foreground" title={formatTimestamp(session.lastSeen)}>{formatRelativeTime(session.lastSeen)}</time><Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); onOpen(); }}>View session →</Button>
  </div>;
}

export function SessionsPage() {
  const { currentOrg, currentSite } = useWorkspace(); const navigate = useNavigate(); const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<{ sessions: SessionSummary[]; total: number; limit: number; offset: number } | null>(null); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]); const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const filterQuery = searchParams.toString(); const page = Math.max(1, Number(searchParams.get("page") ?? 1)); const search = searchParams.get("search") ?? ""; const sort = searchParams.get("sort") ?? "newest";
  const filters = readFilters(searchParams, ["range", "segmentId", "visitorType", "pageId", "hasReplay", "deviceType"]); const range = resolveDateRange((filters.range?.[0] ?? "30d") as DateRangePreset);
  const definitions: FilterDefinition[] = [
    { key: "range", label: "Date range", options: [{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }] },
    { key: "segmentId", label: "Segment", options: segments.map((item) => ({ value: item.id, label: item.name })) },
    { key: "visitorType", label: "Visitor type", options: [{ value: "identified", label: "Identified" }, { value: "anonymous", label: "Anonymous" }] },
    { key: "pageId", label: "Visited page", options: pages.map((item) => ({ value: item.id, label: item.name })), multiple: true },
    { key: "hasReplay", label: "Replay", options: [{ value: "true", label: "Replay available" }, { value: "false", label: "No replay" }] },
    { key: "deviceType", label: "Device", options: [{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }, { value: "tablet", label: "Tablet" }], multiple: true },
  ];
  const update = (next: URLSearchParams) => setSearchParams(next, { replace: true });
  const setFilters = (next: AppliedFilters) => { const params = writeFilters(searchParams, next, definitions.map((item) => item.key)); params.set("page", "1"); update(params); };
  const setSearch = (value: string) => { const params = new URLSearchParams(searchParams); value ? params.set("search", value) : params.delete("search"); params.set("page", "1"); update(params); };
  useEffect(() => { if (!currentOrg || !currentSite) return; void Promise.all([segmentsApi.listSegments(currentOrg.orgId, currentSite.id, { limit: 100 }), pagesApi.listPages(currentOrg.orgId, currentSite.id)]).then(([segmentResponse, pageResponse]) => { setSegments(segmentResponse.segments); setPages(pageResponse.pages); }).catch(() => { setSegments([]); setPages([]); }); }, [currentOrg, currentSite]);
  useEffect(() => { if (!currentOrg || !currentSite || !range) return; let active = true; setResult(null); setError(null); sessionsApi.listSessions(currentOrg.orgId, currentSite.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, search: search || undefined, since: range.since, until: range.until, segmentId: filters.segmentId?.[0], visitorType: filters.visitorType?.[0] as "identified" | "anonymous" | undefined, pageId: filters.pageId?.[0], hasReplay: filters.hasReplay?.[0] as "true" | "false" | undefined, deviceType: filters.deviceType?.[0], sort: sort as sessionsApi.SessionListOptions["sort"] }).then((response) => { if (active) setResult(response); }).catch(() => { if (active) setError("Couldn't load sessions."); }); return () => { active = false; }; }, [currentOrg, currentSite, filterQuery, retry]);
  if (!currentSite) return <><PageHeader section="Observe" title="Sessions" description="Every captured visitor session for this site." /><DataTableFrame><EmptyState title="No site selected" description="Create or select a site from the switcher above to see its sessions." /></DataTableFrame></>;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE)); const hasFilters = Boolean(search || filters.segmentId || filters.visitorType || filters.pageId || filters.hasReplay || filters.deviceType);
  return <><PageHeader section="Observe" title="Sessions" description={`Recorded session activity on ${currentSite.name}.`} /><AnalyticsFilterBar definitions={definitions} values={filters} onChange={setFilters} search={search} onSearchChange={setSearch} searchPlaceholder="Search session or visitor…" sort={sort} onSortChange={(value) => { const params = new URLSearchParams(searchParams); params.set("sort", value); params.set("page", "1"); update(params); }} sortOptions={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "longest", label: "Longest" }, { value: "shortest", label: "Shortest" }, { value: "activity", label: "Most activity" }, { value: "clicks", label: "Most clicks" }]} /><div className="mb-3 text-sm text-muted-foreground">{result ? <><span className="font-medium text-foreground">{result.total} sessions</span><span className="mx-2">·</span>Page {page} of {totalPages}</> : "Sessions"}</div><DataTableFrame className="overflow-hidden">{error && <div className="flex items-center gap-3 p-4"><div className="flex-1"><ErrorNotice>{error}</ErrorNotice></div><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button></div>}{!error && !result && <LoadingRows count={8} />}{result && result.total === 0 && <EmptyState title={hasFilters ? "No results match these filters" : "No sessions yet"} description={hasFilters ? "Try changing or clearing filters." : "Sessions will appear after the SDK sends events for this site."} action={hasFilters ? <Button variant="outline" onClick={() => setFilters({})}>Clear filters</Button> : undefined} />}{result && result.sessions.length > 0 && <><div className="hidden grid-cols-[minmax(180px,1.3fr)_100px_minmax(190px,1fr)_minmax(125px,.8fr)_90px_auto] gap-3 border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground md:grid"><span>Visitor</span><span>Duration</span><span>Activity</span><span>Device</span><span>Last seen</span><span /></div>{result.sessions.map((session) => <SessionRow key={session.sessionId} session={session} onOpen={() => navigate(`/observe/sessions/${session.sessionId}`)} />)}</>}</DataTableFrame>{result && result.total > 0 && <div className="mt-4 flex items-center justify-between"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => { const params = new URLSearchParams(searchParams); params.set("page", String(page - 1)); update(params); }}>← Previous</Button><span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={result.offset + result.sessions.length >= result.total} onClick={() => { const params = new URLSearchParams(searchParams); params.set("page", String(page + 1)); update(params); }}>Next →</Button></div>}</>;
}

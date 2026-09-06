import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionActivity } from "../../types/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableFrame, ErrorNotice, LoadingRows } from "@/components/PageSurface";
import { SessionEpisodeCard } from "./session-detail/SessionEpisodeCard";
import { SessionNavigator } from "./session-detail/SessionNavigator";
import { activityDensity, createEpisodes, type FilterKind } from "./session-detail/sessionTimeline";
import { SessionSummary } from "./session-detail/SessionSummary";

const FILTERS: [FilterKind, string][] = [["click", "Clicks"], ["custom", "Application events"], ["long_hover", "Long hovers"], ["derived_signal", "Derived signals"]];

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionActivity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<Record<FilterKind, boolean>>({ click: true, custom: true, long_hover: true, derived_signal: false });
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const episodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!currentOrg || !currentSite || !sessionId) return;
    const controller = new AbortController();
    setSession(null); setNotFound(false); setError(null);
    sessionsApi.getSessionActivity(currentOrg.orgId, currentSite.id, sessionId, controller.signal).then(setSession).catch((err) => {
      if (controller.signal.aborted || err?.name === "AbortError") return;
      if (err?.status === 404) setNotFound(true); else setError("Couldn't load this session.");
    });
    return () => controller.abort();
  }, [currentOrg, currentSite, sessionId, reloadKey]);

  const episodes = useMemo(() => session ? createEpisodes(session, filters) : [], [session, filters]);
  const density = useMemo(() => session ? activityDensity(session, filters) : [], [session, filters]);
  useEffect(() => { if (episodes.length && !episodes.some((episode) => episode.id === activeEpisodeId)) { setActiveEpisodeId(episodes[0].id); setExpandedIds((current) => current.size ? current : new Set([episodes[0].id])); } }, [episodes, activeEpisodeId]);
  const selectEpisode = (id: string, scroll = true) => { setActiveEpisodeId(id); setExpandedIds((current) => new Set(current).add(id)); if (scroll) episodeRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const visitorPath = session?.visitor?.type === "identified" ? `/users/${session.visitor.id}` : session?.visitor ? `/users/anonymous/${session.visitor.id}` : null;

  return <>
    <div className="mb-1"><Link to="/observe/sessions" className="text-[13px] text-muted-foreground hover:text-foreground">← All sessions</Link></div>
    <PageHeader section="Observe" title="Session activity" description={sessionId ? `Recorded evidence for ${sessionId}` : "Recorded session evidence"} />
    {error && <div className="flex items-center gap-3"><div className="flex-1"><ErrorNotice>{error}</ErrorNotice></div><Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button></div>}
    {notFound && <DataTableFrame><EmptyState title="Session not found" description="This session doesn't exist for this site." /></DataTableFrame>}
    {!error && !notFound && !session && <DataTableFrame><LoadingRows count={6} /></DataTableFrame>}
    {session && <>
      <SessionSummary session={session} visitorPath={visitorPath} onViewHeatmap={() => navigate(`/observe/heatmaps?session=${session.sessionId}`)} />
      <div className="mb-4 rounded-lg border bg-card px-4 py-3"><div className="flex flex-wrap items-center gap-4"><strong className="text-[13px]">Show</strong>{FILTERS.map(([kind, label]) => <label key={kind} className="inline-flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={filters[kind]} onCheckedChange={(checked) => setFilters((value) => ({ ...value, [kind]: checked === true }))} />{label}</label>)}</div></div>
      {episodes.length === 0 ? <div className="card"><EmptyState title="No page activity" description="No page-grouped activity could be built for this session." /></div> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-3">{episodes.map((episode) => <div key={episode.id} ref={(node) => { episodeRefs.current[episode.id] = node; }}><SessionEpisodeCard episode={episode} firstObserved={session.firstObserved} active={episode.id === activeEpisodeId} expanded={expandedIds.has(episode.id)} onToggle={() => { setActiveEpisodeId(episode.id); setExpandedIds((current) => { const next = new Set(current); if (next.has(episode.id)) next.delete(episode.id); else next.add(episode.id); return next; }); }} /></div>)}<div className="rounded-lg border bg-card p-4 text-[12.5px] leading-relaxed text-muted-foreground"><strong className="text-foreground">Evidence notes.</strong> {session.limitations.observedDuration} {session.limitations.hover} {session.limitations.pointer} The compact response covers all {session.coverage.rawEventCount} stored events and summarizes {session.coverage.cursorSampleCount} cursor samples without returning individual coordinates.</div></div><SessionNavigator episodes={episodes} density={density} durationMs={session.observedDurationMs} activeEpisodeId={activeEpisodeId} onSelect={selectEpisode} /></div>}
    </>}
  </>;
}

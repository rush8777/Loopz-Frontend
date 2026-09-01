import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DateRangePicker } from "../../components/DateRangePicker";
import { SparkBarChart } from "../../components/SparkBarChart";
import { resolveDateRange, type DateRangePreset } from "../../lib/dateRange";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableFrame, ErrorNotice, LoadingRows, Metric, MetricGrid, dataTableClass } from "@/components/PageSurface";
import * as funnelsApi from "../../api/funnels";
import * as segmentsApi from "../../api/segments";
import type { Funnel, FunnelAnalysis, FunnelStepUser, Segment } from "../../types/api";

const STEP_USERS_PAGE_SIZE = 25;

export function FunnelDetailPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const preset = (searchParams.get("range") as DateRangePreset | null) ?? "30d";
  const customSince = searchParams.get("since") ?? undefined;
  const customUntil = searchParams.get("until") ?? undefined;
  const segmentId = searchParams.get("segmentId") ?? "";
  // Memoized so `range` stays referentially/value-stable across re-renders
  // triggered by unrelated state (segments loading, analysis loading) -
  // resolveDateRange computes `until` from `new Date()` for non-custom
  // presets, so recomputing on every render would otherwise change the
  // analyze effect's dependency values on every render and refetch in a
  // tight loop.
  const range = useMemo(() => resolveDateRange(preset, customSince, customUntil), [preset, customSince, customUntil]);

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openStepIndex, setOpenStepIndex] = useState<number | null>(null);

  function updateRange(nextPreset: DateRangePreset, nextSince?: string, nextUntil?: string) {
    const next = new URLSearchParams(searchParams);
    next.set("range", nextPreset);
    if (nextSince) next.set("since", nextSince);
    else next.delete("since");
    if (nextUntil) next.set("until", nextUntil);
    else next.delete("until");
    setSearchParams(next, { replace: true });
  }

  function updateSegment(nextSegmentId: string) {
    const next = new URLSearchParams(searchParams);
    if (nextSegmentId) next.set("segmentId", nextSegmentId);
    else next.delete("segmentId");
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (!currentOrg || !currentSite || !funnelId) return;
    setFunnel(null);
    setError(null);
    funnelsApi
      .getFunnel(currentOrg.orgId, currentSite.id, funnelId)
      .then(setFunnel)
      .catch(() => setError("Couldn't load this funnel."));
  }, [currentOrg, currentSite, funnelId]);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    segmentsApi.listSegments(currentOrg.orgId, currentSite.id, { limit: 100 }).then((res) => setSegments(res.segments));
  }, [currentOrg, currentSite]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !funnelId || !range) return;
    setAnalysis(null);
    setOpenStepIndex(null);
    funnelsApi
      .analyzeFunnel(currentOrg.orgId, currentSite.id, funnelId, range, { segmentId: segmentId || undefined })
      .then(setAnalysis)
      .catch(() => setError("Couldn't analyze this funnel."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg, currentSite, funnelId, range?.since, range?.until, segmentId]);

  async function handleDelete() {
    if (!currentOrg || !currentSite || !funnelId) return;
    if (!window.confirm("Delete this funnel? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await funnelsApi.deleteFunnel(currentOrg.orgId, currentSite.id, funnelId);
      navigate("/observe/funnels");
    } catch {
      setError("Couldn't delete this funnel.");
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader section="Observe" title="Funnel" />
        <ErrorNotice>{error}</ErrorNotice>
      </>
    );
  }

  if (!funnel) {
    return (
      <>
        <PageHeader section="Observe" title="Funnel" />
        <Skeleton className="h-72 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title={funnel.name}
        description={funnel.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/observe/funnels/${funnel.id}/edit`)}>
              Edit
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker preset={preset} customSince={customSince} customUntil={customUntil} onChange={updateRange} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-muted-foreground">Analyze users:</span>
          <select className="h-9 w-[200px] rounded-md border bg-input px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20" value={segmentId} onChange={(e) => updateSegment(e.target.value)}>
            <option value="">All users</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {analysis === null || !range ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <FunnelResults
          analysis={analysis}
          since={range.since}
          until={range.until}
          openStepIndex={openStepIndex}
          onToggleStep={(i) => setOpenStepIndex(openStepIndex === i ? null : i)}
          orgId={currentOrg!.orgId}
          siteId={currentSite!.id}
          funnelId={funnel.id}
          segmentId={segmentId || undefined}
          onOpenUser={(user) => navigate(user.trackedUserId ? `/users/${user.trackedUserId}` : `/users/anonymous/${user.anonymousId}`)}
        />
      )}
    </>
  );
}

function FunnelResults({
  analysis,
  since,
  until,
  openStepIndex,
  onToggleStep,
  orgId,
  siteId,
  funnelId,
  segmentId,
  onOpenUser,
}: {
  analysis: FunnelAnalysis;
  since: string;
  until: string;
  openStepIndex: number | null;
  onToggleStep: (index: number) => void;
  orgId: string;
  siteId: string;
  funnelId: string;
  segmentId: string | undefined;
  onOpenUser: (user: FunnelStepUser) => void;
}) {
  if (analysis.steps.length === 0) {
    return (
      <div className="card">
        <EmptyState title="This funnel has no steps" description="Edit the funnel to add at least one step." />
      </div>
    );
  }

  const maxUsers = analysis.steps[0].users || 1;

  return (
    <>
      <MetricGrid className="mb-5 sm:grid-cols-3 lg:grid-cols-3"><Metric label="Conversion" value={`${analysis.overallConversion}%`} /><Metric label="Started" value={`${analysis.totalUsers.toLocaleString()} users`} /><Metric label="Completed" value={`${analysis.convertedUsers.toLocaleString()} users`} /></MetricGrid>

      <section className="mb-5 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Funnel</h2>
        <div className="space-y-1">
          {analysis.steps.map((step, i) => (
            <div key={step.index}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <div className="min-w-0 break-words text-[13.5px] font-medium">
                  {i + 1}. {step.label}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onToggleStep(step.index)}>
                  {step.users.toLocaleString()} users · {step.conversionFromStart}%
                </Button>
              </div>
              <div className="h-[22px] overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-primary"
                  style={{
                    width: `${Math.max(2, (step.users / maxUsers) * 100)}%`,
                  }}
                />
              </div>

              {openStepIndex === step.index && (
                <StepUsersPanel
                  orgId={orgId}
                  siteId={siteId}
                  funnelId={funnelId}
                  stepIndex={step.index}
                  since={since}
                  until={until}
                  segmentId={segmentId}
                  onOpenUser={onOpenUser}
                />
              )}

              {i < analysis.steps.length - 1 && (
                <div className="flex items-center gap-1.5 px-1 py-1.5 text-xs text-muted-foreground">
                  <span>↓ {analysis.steps[i + 1].conversionFromPrevious}% conversion</span>
                  <span>·</span>
                  <span>{step.droppedBeforeNext.toLocaleString()} dropped off</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2.5 text-[13.5px] font-semibold">Conversion over time</div>
        {analysis.trend.every((p) => p.startedUsers === 0) ? (
          <EmptyState title="No data in this range" description="Try a wider date range." />
        ) : (
          <SparkBarChart points={analysis.trend.map((p) => ({ date: p.date, count: p.conversion }))} />
        )}
      </div>
    </>
  );
}

function StepUsersPanel({
  orgId,
  siteId,
  funnelId,
  stepIndex,
  since,
  until,
  segmentId,
  onOpenUser,
}: {
  orgId: string;
  siteId: string;
  funnelId: string;
  stepIndex: number;
  since: string;
  until: string;
  segmentId: string | undefined;
  onOpenUser: (user: FunnelStepUser) => void;
}) {
  const [users, setUsers] = useState<FunnelStepUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setUsers(null);
    funnelsApi
      .getFunnelStepUsers(orgId, siteId, funnelId, stepIndex, { since, until }, { segmentId, limit: STEP_USERS_PAGE_SIZE, offset })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      });
  }, [orgId, siteId, funnelId, stepIndex, since, until, segmentId, offset]);

  return (
    <DataTableFrame className="my-2 bg-muted/30">
      {users === null ? (
        <LoadingRows count={2} />
      ) : users.length === 0 ? (
        <div className="p-3">
          <EmptyState title="No users reached this step" description="Nobody matched in this date range and filter." />
        </div>
      ) : (
        <>
          <table className={dataTableClass}>
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.trackedUserId ?? u.anonymousId} onClick={() => onOpenUser(u)}>
                  <td className="mono">{u.identityType === "identified" ? u.externalUserId : u.anonymousId}</td>
                  <td>
                    <span className={`badge ${u.identityType === "identified" ? "badge-observe" : "badge-neutral"}`}>
                      {u.identityType === "identified" ? "Identified" : "Anonymous"}
                    </span>
                  </td>
                  <td className="text-muted-foreground" title={u.lastSeenAt ? formatTimestamp(u.lastSeenAt) : undefined}>
                    {u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > STEP_USERS_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
              <span className="text-xs text-muted-foreground">
                {offset + 1}–{Math.min(offset + STEP_USERS_PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - STEP_USERS_PAGE_SIZE))}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" disabled={offset + STEP_USERS_PAGE_SIZE >= total} onClick={() => setOffset(offset + STEP_USERS_PAGE_SIZE)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DataTableFrame>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DateRangePicker } from "../../components/DateRangePicker";
import { SparkBarChart } from "../../components/SparkBarChart";
import { resolveDateRange, type DateRangePreset } from "../../lib/dateRange";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
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
        <div className="card">
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        </div>
      </>
    );
  }

  if (!funnel) {
    return (
      <>
        <PageHeader section="Observe" title="Funnel" />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 300 }} />
        </div>
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
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/observe/funnels/${funnel.id}/edit`)}>
              Edit
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <DateRangePicker preset={preset} customSince={customSince} customUntil={customUntil} onChange={updateRange} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Analyze users:</span>
          <select className="input" style={{ width: 200 }} value={segmentId} onChange={(e) => updateSegment(e.target.value)}>
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
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 260 }} />
        </div>
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
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div className="card card-padded" style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Conversion</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{analysis.overallConversion}%</div>
        </div>
        <div className="card card-padded" style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Started</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{analysis.totalUsers.toLocaleString()} users</div>
        </div>
        <div className="card card-padded" style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Completed</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{analysis.convertedUsers.toLocaleString()} users</div>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 14 }}>Funnel</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {analysis.steps.map((step, i) => (
            <div key={step.index}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                  {i + 1}. {step.label}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => onToggleStep(step.index)}>
                  {step.users.toLocaleString()} users · {step.conversionFromStart}%
                </button>
              </div>
              <div style={{ height: 22, background: "var(--surface-raised)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, (step.users / maxUsers) * 100)}%`,
                    background: "var(--observe)",
                    borderRadius: "var(--radius-sm)",
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
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px", fontSize: 12, color: "var(--text-secondary)" }}>
                  <span>↓ {analysis.steps[i + 1].conversionFromPrevious}% conversion</span>
                  <span>·</span>
                  <span>{step.droppedBeforeNext.toLocaleString()} dropped off</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card card-padded">
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Conversion over time</div>
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
    <div className="card" style={{ margin: "6px 0 12px", background: "var(--surface-raised)" }}>
      {users === null ? (
        <div style={{ padding: 12 }}>
          <div className="skeleton" style={{ height: 80 }} />
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: 12 }}>
          <EmptyState title="No users reached this step" description="Nobody matched in this date range and filter." />
        </div>
      ) : (
        <>
          <table className="table">
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
                  <td style={{ color: "var(--text-secondary)" }} title={u.lastSeenAt ? formatTimestamp(u.lastSeenAt) : undefined}>
                    {u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > STEP_USERS_PAGE_SIZE && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {offset + 1}–{Math.min(offset + STEP_USERS_PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - STEP_USERS_PAGE_SIZE))}>
                  Previous
                </button>
                <button className="btn btn-ghost btn-sm" disabled={offset + STEP_USERS_PAGE_SIZE >= total} onClick={() => setOffset(offset + STEP_USERS_PAGE_SIZE)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

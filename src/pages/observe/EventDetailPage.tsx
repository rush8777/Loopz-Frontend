import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DateRangePicker } from "../../components/DateRangePicker";
import { SparkBarChart } from "../../components/SparkBarChart";
import { resolveDateRange, type DateRangePreset } from "../../lib/dateRange";
import { formatTimestamp } from "../../lib/format";
import * as eventsApi from "../../api/events";
import type {
  EventSummary,
  TimeseriesPoint,
  PropertySummary,
  EventOccurrence,
  EventUserSummary,
  EventSessionSummary,
  EventPageSummary,
} from "../../types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableFrame, ErrorNotice, LoadingRows, Metric, MetricGrid, dataTableClass } from "@/components/PageSurface";
import { cn } from "@/lib/utils";

type Tab = "properties" | "occurrences" | "users" | "sessions" | "pages";

export function EventDetailPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const { eventName = "" } = useParams<{ eventName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const preset = (searchParams.get("range") as DateRangePreset | null) ?? "30d";
  const customSince = searchParams.get("since") ?? undefined;
  const customUntil = searchParams.get("until") ?? undefined;
  const tab = (searchParams.get("tab") as Tab | null) ?? "properties";
  const occurrenceId = searchParams.get("occurrence") ?? undefined;

  const range = resolveDateRange(preset, customSince, customUntil);

  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (!currentOrg || !currentSite || !range || !eventName) return;
    setSummary(null);
    setError(null);
    setNotFound(false);
    eventsApi
      .getEventSummary(currentOrg.orgId, currentSite.id, eventName, range)
      .then(setSummary)
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
        else setError("Couldn't load this event.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg, currentSite, eventName, preset, customSince, customUntil]);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title={eventName} />
        <div className="card">
          <EmptyState title="No site selected" description="Select a site from the switcher above." />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PageHeader section="Observe" title={eventName} />
        <div className="card">
          <EmptyState title="Event not found" description="This event has never been recorded for this site." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title={eventName}
        description="Application event"
        actions={
          <DateRangePicker
            preset={preset}
            customSince={customSince}
            customUntil={customUntil}
            onChange={(p, since, until) => updateParams({ range: p, since, until })}
          />
        }
      />

      {error && (
        <div className="mb-4"><ErrorNotice>{error}</ErrorNotice></div>
      )}

      {!error && (
        <>
          <OverviewSection summary={summary} range={range} orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} />

          <div className="mt-6 mb-4 flex gap-1 overflow-x-auto border-b">
            {(["properties", "occurrences", "users", "sessions", "pages"] as Tab[]).map((t) => (
              <TabButton key={t} active={tab === t} onClick={() => updateParams({ tab: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </TabButton>
            ))}
          </div>

          <DataTableFrame>
            {tab === "properties" && (
              <PropertiesTab orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} range={range} />
            )}
            {tab === "occurrences" && (
              <OccurrencesTab
                orgId={currentOrg!.orgId}
                siteId={currentSite.id}
                eventName={eventName}
                range={range}
                selectedOccurrenceId={occurrenceId}
                onSelect={(id) => updateParams({ occurrence: id })}
                onCloseDrawer={() => updateParams({ occurrence: undefined })}
                onNavigate={navigate}
              />
            )}
            {tab === "users" && <UsersTab orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} range={range} onNavigate={navigate} />}
            {tab === "sessions" && (
              <SessionsTab orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} range={range} onNavigate={navigate} />
            )}
            {tab === "pages" && <PagesTab orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} range={range} />}
          </DataTableFrame>
        </>
      )}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="sm"
      onClick={onClick}
      className={cn("rounded-b-none border-b-2 border-transparent text-muted-foreground", active && "border-primary font-semibold text-foreground")}
    >
      {children}
    </Button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <Metric label={label} value={value} />;
}

function OverviewSection({
  summary,
  range,
  orgId,
  siteId,
  eventName,
}: {
  summary: EventSummary | null;
  range: { since: string; until: string } | null;
  orgId: string;
  siteId: string;
  eventName: string;
}) {
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setTimeseries(null);
    eventsApi.getEventTimeseries(orgId, siteId, eventName, range).then((res) => setTimeseries(res.points));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!summary) {
    return (
      <MetricGrid>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</MetricGrid>
    );
  }

  return (
    <>
      <MetricGrid className="mb-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Occurrences" value={summary.occurrences.toLocaleString()} />
        <MetricCard label="Unique users" value={summary.uniqueUsers.toLocaleString()} />
        <MetricCard label="Sessions" value={summary.sessions.toLocaleString()} />
        <MetricCard label="First seen" value={summary.firstSeenAt ? formatTimestamp(summary.firstSeenAt) : "—"} />
        <MetricCard label="Last seen" value={summary.lastSeenAt ? formatTimestamp(summary.lastSeenAt) : "—"} />
      </MetricGrid>

      <div className="mb-2 rounded-lg border bg-card p-4">
        <div className="mb-3 text-[13.5px] font-semibold">Occurrences over time</div>
        {timeseries === null ? <Skeleton className="h-[140px]" /> : <SparkBarChart points={timeseries} />}
      </div>

      {summary.usedIn.patterns.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-[13.5px] font-semibold">Used in</div>
          <div className="mb-1 text-[12.5px] text-muted-foreground">Patterns</div>
          <div className="flex flex-col gap-1">
            {summary.usedIn.patterns.map((p) => (
              <div key={p.id} className="text-[13px] text-foreground">
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PropertiesTab({
  orgId,
  siteId,
  eventName,
  range,
}: {
  orgId: string;
  siteId: string;
  eventName: string;
  range: { since: string; until: string } | null;
}) {
  const [properties, setProperties] = useState<PropertySummary[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setProperties(null);
    eventsApi.getEventProperties(orgId, siteId, eventName, range).then((res) => setProperties(res.properties));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  if (properties === null) {
    return (
      <LoadingRows count={3} />
    );
  }

  if (properties.length === 0) {
    return <EmptyState title="No properties recorded for this event." description="Pass a properties object to analytics.event() to see a breakdown here." />;
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {properties.map((p) => (
        <div key={p.name}>
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            {p.name}
            <Badge variant="secondary">
              {p.type}
            </Badge>
          </div>
          {(p.type === "string" || p.type === "boolean") && (
            <div className="flex flex-col gap-1">
              {p.values.map((v) => (
                <div key={v.value} className="flex items-center gap-2 text-[12.5px]">
                  <span className="mono w-[120px] truncate text-muted-foreground">
                    {v.value}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${v.percent}%` }} />
                  </div>
                  <span className="mono w-[70px] text-right text-muted-foreground">
                    {v.percent}% ({v.count})
                  </span>
                </div>
              ))}
            </div>
          )}
          {p.type === "number" && (
            <div className="flex gap-5 text-[12.5px]">
              <div>
                <div className="text-muted-foreground">min</div>
                <div className="mono">{p.min}</div>
              </div>
              <div>
                <div className="text-muted-foreground">median</div>
                <div className="mono">{p.median}</div>
              </div>
              <div>
                <div className="text-muted-foreground">max</div>
                <div className="mono">{p.max}</div>
              </div>
            </div>
          )}
          {(p.type === "array" || p.type === "object" || p.type === "null") && (
            <div className="text-xs text-muted-foreground">
              {p.sampleCount} sample{p.sampleCount === 1 ? "" : "s"} - see individual occurrences for full values
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function occurrenceUserLabel(o: { anonymousId: string | null; externalUserId: string | null }): string {
  if (o.externalUserId) return o.externalUserId;
  if (o.anonymousId) return "Anonymous";
  return "—";
}

function OccurrencesTab({
  orgId,
  siteId,
  eventName,
  range,
  selectedOccurrenceId,
  onSelect,
  onCloseDrawer,
  onNavigate,
}: {
  orgId: string;
  siteId: string;
  eventName: string;
  range: { since: string; until: string } | null;
  selectedOccurrenceId?: string;
  onSelect: (id: string) => void;
  onCloseDrawer: () => void;
  onNavigate: (path: string) => void;
}) {
  const [occurrences, setOccurrences] = useState<EventOccurrence[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setOccurrences(null);
    eventsApi.listEventOccurrences(orgId, siteId, eventName, { ...range, limit: 50 }).then((res) => setOccurrences(res.occurrences));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = occurrences?.find((o) => o.id === selectedOccurrenceId) ?? null;

  if (occurrences === null) {
    return (
      <LoadingRows />
    );
  }

  if (occurrences.length === 0) {
    return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;
  }

  return (
    <>
      <table className={dataTableClass}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Page</th>
          </tr>
        </thead>
        <tbody>
          {occurrences.map((o) => (
            <tr key={o.id} onClick={() => onSelect(o.id)}>
              <td className="mono">{formatTimestamp(o.timestamp)}</td>
              <td>{occurrenceUserLabel(o)}</td>
              <td className="mono text-muted-foreground">
                {o.pagePath ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <OccurrenceDrawer occurrence={selected} eventName={eventName} onClose={onCloseDrawer} onNavigate={onNavigate} />}
    </>
  );
}

function OccurrenceDrawer({
  occurrence,
  eventName,
  onClose,
  onNavigate,
}: {
  occurrence: EventOccurrence;
  eventName: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <div role="dialog" aria-label={`${eventName} occurrence`} className="fixed inset-y-0 right-0 z-50 w-full max-w-[380px] overflow-y-auto border-l bg-card p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 break-words text-[15px] font-semibold">{eventName}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="flex flex-col gap-3.5 text-[13px]">
        <Field label="Timestamp" value={formatTimestamp(occurrence.timestamp)} />
        <Field label="User" value={occurrenceUserLabel(occurrence)} />
        <Field label="Page" value={occurrence.pagePath ?? "—"} />

        <div>
          <div className="mb-1.5 text-muted-foreground">Properties</div>
          {occurrence.properties && Object.keys(occurrence.properties).length > 0 ? (
            <pre
              className="mono overflow-x-auto rounded-md bg-muted p-2.5 text-[11.5px]"
            >
              {JSON.stringify(occurrence.properties, null, 2)}
            </pre>
          ) : (
            <div className="text-xs text-muted-foreground">No properties recorded for this event.</div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(`/observe/sessions/${occurrence.sessionId}`)}>
            View session
          </Button>
          {occurrence.trackedUserId ? (
            <Button variant="outline" size="sm" onClick={() => onNavigate(`/users/${occurrence.trackedUserId}`)}>
              View user
            </Button>
          ) : occurrence.anonymousId ? (
            <Button variant="outline" size="sm" onClick={() => onNavigate(`/users/anonymous/${occurrence.anonymousId}`)}>
              View user
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-muted-foreground">{label}</div>
      <div className="mono break-words text-foreground">
        {value}
      </div>
    </div>
  );
}

function UsersTab({
  orgId,
  siteId,
  eventName,
  range,
  onNavigate,
}: {
  orgId: string;
  siteId: string;
  eventName: string;
  range: { since: string; until: string } | null;
  onNavigate: (path: string) => void;
}) {
  const [users, setUsers] = useState<EventUserSummary[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setUsers(null);
    eventsApi.getEventUsers(orgId, siteId, eventName, { ...range, limit: 50 }).then((res) => setUsers(res.users));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  if (users === null) {
    return (
      <LoadingRows />
    );
  }
  if (users.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className={dataTableClass}>
      <thead>
        <tr>
          <th>User</th>
          <th>Occurrences</th>
          <th>First seen</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u, i) => (
          <tr
            key={i}
            onClick={() => onNavigate(u.trackedUserId ? `/users/${u.trackedUserId}` : `/users/anonymous/${u.anonymousId}`)}
          >
            <td>{u.identityType === "identified" ? u.externalUserId : "Anonymous"}</td>
            <td className="mono">{u.occurrences.toLocaleString()}</td>
            <td className="text-muted-foreground">{formatTimestamp(u.firstSeenAt)}</td>
            <td className="text-muted-foreground">{formatTimestamp(u.lastSeenAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SessionsTab({
  orgId,
  siteId,
  eventName,
  range,
  onNavigate,
}: {
  orgId: string;
  siteId: string;
  eventName: string;
  range: { since: string; until: string } | null;
  onNavigate: (path: string) => void;
}) {
  const [sessions, setSessions] = useState<EventSessionSummary[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setSessions(null);
    eventsApi.getEventSessions(orgId, siteId, eventName, { ...range, limit: 50 }).then((res) => setSessions(res.sessions));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sessions === null) {
    return (
      <LoadingRows />
    );
  }
  if (sessions.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className={dataTableClass}>
      <thead>
        <tr>
          <th>Session</th>
          <th>Occurrences</th>
          <th>First seen</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.sessionId} onClick={() => onNavigate(`/observe/sessions/${s.sessionId}`)}>
            <td className="mono">{s.sessionId}</td>
            <td className="mono">{s.occurrences.toLocaleString()}</td>
            <td className="text-muted-foreground">{formatTimestamp(s.firstSeenAt)}</td>
            <td className="text-muted-foreground">{formatTimestamp(s.lastSeenAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PagesTab({
  orgId,
  siteId,
  eventName,
  range,
}: {
  orgId: string;
  siteId: string;
  eventName: string;
  range: { since: string; until: string } | null;
}) {
  const [pages, setPages] = useState<EventPageSummary[] | null>(null);

  useEffect(() => {
    if (!range) return;
    setPages(null);
    eventsApi.getEventPages(orgId, siteId, eventName, range).then((res) => setPages(res.pages));
  }, [orgId, siteId, eventName, range?.since, range?.until]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pages === null) {
    return (
      <LoadingRows />
    );
  }
  if (pages.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className={dataTableClass}>
      <thead>
        <tr>
          <th>Page</th>
          <th>Occurrences</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p, i) => (
          <tr key={i}>
            <td className="mono break-all text-foreground">
              {p.pagePath ?? "Unknown page"}
            </td>
            <td className="mono">{p.occurrences.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

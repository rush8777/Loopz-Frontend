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
        <div className="error-banner" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!error && (
        <>
          <OverviewSection summary={summary} range={range} orgId={currentOrg!.orgId} siteId={currentSite.id} eventName={eventName} />

          <div style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 16 }}>
            {(["properties", "occurrences", "users", "sessions", "pages"] as Tab[]).map((t) => (
              <TabButton key={t} active={tab === t} onClick={() => updateParams({ tab: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </TabButton>
            ))}
          </div>

          <div className="card">
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
          </div>
        </>
      )}
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card card-padded" style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  );
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
      <div style={{ display: "flex", gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card card-padded skeleton" style={{ flex: 1, height: 66 }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <MetricCard label="Occurrences" value={summary.occurrences.toLocaleString()} />
        <MetricCard label="Unique users" value={summary.uniqueUsers.toLocaleString()} />
        <MetricCard label="Sessions" value={summary.sessions.toLocaleString()} />
        <MetricCard label="First seen" value={summary.firstSeenAt ? formatTimestamp(summary.firstSeenAt) : "—"} />
        <MetricCard label="Last seen" value={summary.lastSeenAt ? formatTimestamp(summary.lastSeenAt) : "—"} />
      </div>

      <div className="card card-padded" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12 }}>Occurrences over time</div>
        {timeseries === null ? <div className="skeleton" style={{ height: 140 }} /> : <SparkBarChart points={timeseries} />}
      </div>

      {summary.usedIn.patterns.length > 0 && (
        <div className="card card-padded">
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Used in</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 4 }}>Patterns</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.usedIn.patterns.map((p) => (
              <div key={p.id} style={{ fontSize: 13, color: "var(--text-primary)" }}>
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
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  if (properties.length === 0) {
    return <EmptyState title="No properties recorded for this event." description="Pass a properties object to analytics.event() to see a breakdown here." />;
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
      {properties.map((p) => (
        <div key={p.name}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            {p.name}
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>
              {p.type}
            </span>
          </div>
          {(p.type === "string" || p.type === "boolean") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.values.map((v) => (
                <div key={v.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <span className="mono" style={{ width: 120, color: "var(--text-secondary)" }}>
                    {v.value}
                  </span>
                  <div style={{ flex: 1, background: "var(--surface-raised)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${v.percent}%`, height: "100%", background: "var(--observe)" }} />
                  </div>
                  <span className="mono" style={{ color: "var(--text-muted)", width: 70, textAlign: "right" }}>
                    {v.percent}% ({v.count})
                  </span>
                </div>
              ))}
            </div>
          )}
          {p.type === "number" && (
            <div style={{ display: "flex", gap: 20, fontSize: 12.5 }}>
              <div>
                <div style={{ color: "var(--text-muted)" }}>min</div>
                <div className="mono">{p.min}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)" }}>median</div>
                <div className="mono">{p.median}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)" }}>max</div>
                <div className="mono">{p.max}</div>
              </div>
            </div>
          )}
          {(p.type === "array" || p.type === "object" || p.type === "null") && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
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
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (occurrences.length === 0) {
    return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;
  }

  return (
    <>
      <table className="table">
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
              <td className="mono" style={{ color: "var(--text-secondary)" }}>
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
    <div
      role="dialog"
      aria-label={`${eventName} occurrence`}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        padding: 20,
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{eventName}</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
        <Field label="Timestamp" value={formatTimestamp(occurrence.timestamp)} />
        <Field label="User" value={occurrenceUserLabel(occurrence)} />
        <Field label="Page" value={occurrence.pagePath ?? "—"} />

        <div>
          <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>Properties</div>
          {occurrence.properties && Object.keys(occurrence.properties).length > 0 ? (
            <pre
              className="mono"
              style={{ background: "var(--surface-raised)", padding: 10, borderRadius: "var(--radius-sm)", fontSize: 11.5, overflowX: "auto" }}
            >
              {JSON.stringify(occurrence.properties, null, 2)}
            </pre>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No properties recorded for this event.</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(`/observe/sessions/${occurrence.sessionId}`)}>
            View session
          </button>
          {occurrence.trackedUserId ? (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(`/users/${occurrence.trackedUserId}`)}>
              View user
            </button>
          ) : occurrence.anonymousId ? (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(`/users/anonymous/${occurrence.anonymousId}`)}>
              View user
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--text-secondary)", marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ color: "var(--text-primary)" }}>
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
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }
  if (users.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className="table">
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
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(u.firstSeenAt)}</td>
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(u.lastSeenAt)}</td>
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
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }
  if (sessions.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className="table">
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
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(s.firstSeenAt)}</td>
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(s.lastSeenAt)}</td>
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
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }
  if (pages.length === 0) return <EmptyState title="No occurrences in this date range." description="Try expanding the date range." />;

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Page</th>
          <th>Occurrences</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p, i) => (
          <tr key={i}>
            <td className="mono" style={{ color: "var(--text-primary)" }}>
              {p.pagePath ?? "Unknown page"}
            </td>
            <td className="mono">{p.occurrences.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

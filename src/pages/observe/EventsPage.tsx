import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DateRangePicker } from "../../components/DateRangePicker";
import { resolveDateRange, type DateRangePreset } from "../../lib/dateRange";
import { formatTimestamp } from "../../lib/format";
import * as eventsApi from "../../api/events";
import type { EventDefinitionSummary } from "../../types/api";

export function EventsPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const preset = (searchParams.get("range") as DateRangePreset | null) ?? "30d";
  const customSince = searchParams.get("since") ?? undefined;
  const customUntil = searchParams.get("until") ?? undefined;

  const [events, setEvents] = useState<EventDefinitionSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const range = resolveDateRange(preset, customSince, customUntil);

  useEffect(() => {
    if (!currentOrg || !currentSite || !range) return;
    setEvents(null);
    setError(null);
    eventsApi
      .listEvents(currentOrg.orgId, currentSite.id, { search: search || undefined, since: range.since, until: range.until, limit: 100 })
      .then((res) => {
        setEvents(res.events);
        setTotal(res.total);
      })
      .catch(() => setError("Couldn't load events."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg, currentSite, search, preset, customSince, customUntil]);

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Events" description="Track and explore the application events your product sends." />
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
        title="Events"
        description="Application events reported with analytics.event(name, properties) - your product's business events, distinct from autocaptured clicks and hovers."
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search events..."
          value={search}
          onChange={(e) => updateParams({ search: e.target.value || undefined })}
        />
        <DateRangePicker
          preset={preset}
          customSince={customSince}
          customUntil={customUntil}
          onChange={(p, since, until) => updateParams({ range: p, since, until })}
        />
      </div>

      <div className="card">
        {error && (
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        )}
        {!error && <EventsTable events={events} total={total} onOpen={(name) => navigate(`/observe/events/${encodeURIComponent(name)}`)} />}
      </div>
    </>
  );
}

function EventsTable({
  events,
  total,
  onOpen,
}: {
  events: EventDefinitionSummary[] | null;
  total: number;
  onOpen: (name: string) => void;
}) {
  if (events === null) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  if (total === 0 && events.length === 0) {
    return (
      <EmptyState
        title="No events recorded yet"
        description={
          <>
            Track your first application event with:
            <br />
            <code className="mono" style={{ marginTop: 8, fontSize: 12.5, color: "var(--text-primary)" }}>
              analytics.event("event_name", properties)
            </code>
          </>
        }
      />
    );
  }

  if (events.length === 0) {
    return <EmptyState title="No matching events" description="Try a different search term or a wider date range." />;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Occurrences</th>
          <th>Unique users</th>
          <th>Sessions</th>
          <th>First seen</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.name} onClick={() => onOpen(e.name)}>
            <td className="mono" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              {e.name}
            </td>
            <td className="mono">{e.occurrences.toLocaleString()}</td>
            <td className="mono">{e.uniqueUsers.toLocaleString()} users</td>
            <td className="mono">{e.sessions.toLocaleString()} sessions</td>
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(e.firstSeenAt)}</td>
            <td style={{ color: "var(--text-secondary)" }}>{formatTimestamp(e.lastSeenAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as segmentsApi from "../../api/segments";
import type { Segment, SegmentCondition, SegmentGroup, SegmentMember, SegmentNode } from "../../types/api";
import { isSegmentGroup } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";

const PAGE_SIZE = 25;

function describeCondition(c: SegmentCondition): string {
  switch (c.type) {
    case "event": {
      const window = c.timeWindow ? ` (within last ${c.timeWindow.value} ${c.timeWindow.unit})` : "";
      return `Event: ${c.eventName} ${c.operator === "performed" ? "performed" : "not performed"}${window}`;
    }
    case "user_property": {
      if (c.operator === "exists") return `Property: ${c.propertyName} is set`;
      if (c.operator === "not_exists") return `Property: ${c.propertyName} is not set`;
      const opLabel: Record<string, string> = {
        equals: "equals",
        not_equals: "does not equal",
        contains: "contains",
        not_contains: "does not contain",
        greater_than: "is greater than",
        less_than: "is less than",
        greater_than_or_equal: "is at least",
        less_than_or_equal: "is at most",
      };
      return `Property: ${c.propertyName} ${opLabel[c.operator]} ${c.value}`;
    }
    case "page": {
      const window = c.timeWindow ? ` (within last ${c.timeWindow.value} ${c.timeWindow.unit})` : "";
      return `Page: ${c.operator === "visited" ? "visited" : "not visited"}${window}`;
    }
  }
}

function DefinitionTree({ node, depth = 0 }: { node: SegmentNode; depth?: number }) {
  if (isSegmentGroup(node)) {
    const group = node as SegmentGroup;
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? "2px solid var(--border)" : undefined }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", margin: "6px 0" }}>
          {group.logic === "and" ? "ALL of:" : "ANY of:"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {group.conditions.map((child, i) => (
            <DefinitionTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }
  return <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>{describeCondition(node)}</div>;
}

export function SegmentDetailPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();

  const [segment, setSegment] = useState<Segment | null>(null);
  const [members, setMembers] = useState<SegmentMember[] | null>(null);
  const [memberTotal, setMemberTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite || !segmentId) return;
    setSegment(null);
    setError(null);
    segmentsApi
      .getSegment(currentOrg.orgId, currentSite.id, segmentId)
      .then(setSegment)
      .catch(() => setError("Couldn't load this segment."));
  }, [currentOrg, currentSite, segmentId]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !segmentId) return;
    setMembers(null);
    segmentsApi
      .getSegmentMembers(currentOrg.orgId, currentSite.id, segmentId, { limit: PAGE_SIZE, offset })
      .then((res) => {
        setMembers(res.members);
        setMemberTotal(res.total);
      })
      .catch(() => setError("Couldn't load this segment's users."));
  }, [currentOrg, currentSite, segmentId, offset]);

  async function handleDelete() {
    if (!currentOrg || !currentSite || !segmentId) return;
    if (!window.confirm("Delete this segment? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await segmentsApi.deleteSegment(currentOrg.orgId, currentSite.id, segmentId);
      navigate("/segments");
    } catch {
      setError("Couldn't delete this segment.");
      setDeleting(false);
    }
  }

  function openMember(m: SegmentMember) {
    navigate(m.trackedUserId ? `/users/${m.trackedUserId}` : `/users/anonymous/${m.anonymousId}`);
  }

  if (error) {
    return (
      <>
        <PageHeader section="Users" title="Segment" />
        <div className="card">
          <div style={{ padding: 16 }}>
            <div className="error-banner">{error}</div>
          </div>
        </div>
      </>
    );
  }

  if (!segment) {
    return (
      <>
        <PageHeader section="Users" title="Segment" />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Users"
        title={segment.name}
        description={segment.description ?? undefined}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/segments/${segment.id}/edit`)}>
              Edit
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div className="card card-padded" style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Audience</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{segment.audienceCount.toLocaleString()} users</div>
        </div>
        <div className="card card-padded" style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Last updated</div>
          <div style={{ fontSize: 22, fontWeight: 600 }} title={formatTimestamp(segment.updatedAt)}>
            {formatRelativeTime(segment.updatedAt)}
          </div>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Definition</div>
        <DefinitionTree node={segment.definition} />
      </div>

      <div className="card">
        <div style={{ padding: "14px 16px", fontWeight: 600, fontSize: 13.5, borderBottom: "1px solid var(--border)" }}>Users</div>
        {members === null ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 40 }} />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState title="No users match yet" description="As users perform matching events or take on matching properties, they'll show up here." />
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
                {members.map((m) => (
                  <tr key={m.trackedUserId ?? m.anonymousId} onClick={() => openMember(m)}>
                    <td className="mono" style={{ color: "var(--text-primary)" }}>
                      {m.identityType === "identified" ? m.externalUserId : m.anonymousId}
                    </td>
                    <td>
                      <span className={`badge ${m.identityType === "identified" ? "badge-observe" : "badge-neutral"}`}>
                        {m.identityType === "identified" ? "Identified" : "Anonymous"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }} title={m.lastSeenAt ? formatTimestamp(m.lastSeenAt) : undefined}>
                      {m.lastSeenAt ? formatRelativeTime(m.lastSeenAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {memberTotal > PAGE_SIZE && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, memberTotal)} of {memberTotal.toLocaleString()}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Previous
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={offset + PAGE_SIZE >= memberTotal}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

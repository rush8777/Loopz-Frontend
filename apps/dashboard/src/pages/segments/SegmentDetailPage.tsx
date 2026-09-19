import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { AnalyticsMetricCard } from "@/components/analytics/AnalyticsMetricCard";
import { EmptyState } from "../../components/EmptyState";
import * as segmentsApi from "../../api/segments";
import type { Segment, SegmentCondition, SegmentGroup, SegmentMember, SegmentNode } from "../../types/api";
import { isSegmentGroup } from "../../types/api";
import { formatRelativeTime, formatTimestamp } from "../../lib/format";
import { Badge } from "@movecues/ui";
import { Button } from "@movecues/ui";
import { Skeleton } from "@movecues/ui";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";

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
      <div className={depth > 0 ? "border-l-2 pl-4" : undefined}>
        <div className="my-1.5 text-[10px] font-bold uppercase text-muted-foreground">
          {group.logic === "and" ? "ALL of:" : "ANY of:"}
        </div>
        <div className="space-y-1.5">
          {group.conditions.map((child, i) => (
            <DefinitionTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }
  return <div className="text-[13px] text-foreground">{describeCondition(node)}</div>;
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
        <ErrorNotice>{error}</ErrorNotice>
      </>
    );
  }

  if (!segment) {
    return (
      <>
        <PageHeader section="Users" title="Segment" />
        <Skeleton className="h-52 w-full" />
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/segments/${segment.id}/edit`)}>
              Edit
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><AnalyticsMetricCard label="Audience" value={segment.audienceCount.toLocaleString()} description="Users currently matching this segment" /><AnalyticsMetricCard label="Last updated" value={<span title={formatTimestamp(segment.updatedAt)}>{formatRelativeTime(segment.updatedAt)}</span>} description="Most recent definition change" /></div>

      <section className="mb-5 rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Definition</h2>
        <DefinitionTree node={segment.definition} />
      </section>

      <DataTableFrame>
        <div className="border-b px-4 py-3 text-sm font-semibold">Users</div>
        {members === null ? (
          <LoadingRows />
        ) : members.length === 0 ? (
          <EmptyState title="No users match yet" description="As users perform matching events or take on matching properties, they'll show up here." />
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
                {members.map((m) => (
                  <tr key={m.trackedUserId ?? m.anonymousId} onClick={() => openMember(m)}>
                    <td className="mono break-all text-foreground">
                      {m.identityType === "identified" ? m.externalUserId : m.anonymousId}
                    </td>
                    <td>
                      <Badge variant={m.identityType === "identified" ? "secondary" : "outline"}>
                        {m.identityType === "identified" ? "Identified" : "Anonymous"}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground" title={m.lastSeenAt ? formatTimestamp(m.lastSeenAt) : undefined}>
                      {m.lastSeenAt ? formatRelativeTime(m.lastSeenAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {memberTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {offset + 1}–{Math.min(offset + PAGE_SIZE, memberTotal)} of {memberTotal.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm"
                    disabled={offset + PAGE_SIZE >= memberTotal}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DataTableFrame>
    </>
  );
}

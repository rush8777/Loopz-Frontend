import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import * as sessionsApi from "../../api/sessions";
import type { SessionSummary, SessionDetail } from "../../types/api";
import { RrwebSnapshotFrame } from "./RrwebSnapshotFrame";
import { HeatmapOverlay, type HeatmapLayer } from "./HeatmapOverlay";

const RENDER_WIDTH = 860;
const LAYERS: { id: HeatmapLayer; label: string }[] = [
  { id: "click", label: "Clicks" },
  { id: "hover", label: "Hovers" },
  { id: "cursor", label: "Cursor" },
  { id: "scroll", label: "Scroll depth" },
];

export function ReplayPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSessionId = searchParams.get("session");

  const [replaySessions, setReplaySessions] = useState<SessionSummary[] | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [snapshotNode, setSnapshotNode] = useState<unknown>(null);
  const [layer, setLayer] = useState<HeatmapLayer>("click");
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    setReplaySessions(null);
    sessionsApi
      .listSessions(currentOrg.orgId, currentSite.id, { limit: 100 })
      .then((res) => {
        const withReplay = res.sessions.filter((s) => s.hasReplay);
        setReplaySessions(withReplay);
        if (!selectedSessionId && withReplay.length > 0) {
          setSearchParams({ session: withReplay[0].sessionId }, { replace: true });
        }
      })
      .catch(() => setError("Couldn't load sessions."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg, currentSite]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !selectedSessionId) return;
    setSessionDetail(null);
    setSnapshotNode(null);
    setRenderError(null);
    setError(null);

    Promise.all([
      sessionsApi.getSession(currentOrg.orgId, currentSite.id, selectedSessionId),
      sessionsApi.getSessionSnapshot(currentOrg.orgId, currentSite.id, selectedSessionId),
    ])
      .then(([detail, snapshot]) => {
        setSessionDetail(detail);
        // snapshot.data is the raw rrweb FullSnapshot event's data field:
        // { node: serializedNodeWithId, initialOffset }. rebuildIntoSandboxedIframe
        // needs just the node tree.
        const raw = snapshot.data as { node?: unknown } | null;
        setSnapshotNode(raw?.node ?? null);
      })
      .catch((err) => {
        if (err?.status === 404) setRenderError("No page snapshot was captured for this session.");
        else setError("Couldn't load this session's replay data.");
      });
  }, [currentOrg, currentSite, selectedSessionId]);

  const capturedViewport = useMemo(() => {
    if (!sessionDetail) return null;
    const withViewport = sessionDetail.events.find((e) => e.viewportWidth && e.viewportHeight);
    if (!withViewport?.viewportWidth || !withViewport.viewportHeight) return null;
    return { width: withViewport.viewportWidth, height: withViewport.viewportHeight };
  }, [sessionDetail]);

  const renderHeight = capturedViewport
    ? Math.round(RENDER_WIDTH * (capturedViewport.height / capturedViewport.width))
    : Math.round(RENDER_WIDTH * 0.65);

  if (!currentSite) {
    return (
      <>
        <PageHeader section="Observe" title="Replay" description="Full session playback." />
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
        title="Replay"
        description="Captured interaction coordinates overlaid on the session's page snapshot."
        actions={
          replaySessions && replaySessions.length > 0 ? (
            <select
              className="input"
              style={{ width: 240 }}
              value={selectedSessionId ?? ""}
              onChange={(e) => setSearchParams({ session: e.target.value })}
            >
              {replaySessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      {error && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {replaySessions === null && !error && (
        <div className="card card-padded">
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      )}

      {replaySessions && replaySessions.length === 0 && (
        <div className="card">
          <EmptyState
            title="No session replay data yet"
            description={
              <>
                Playback is built from an rrweb page snapshot plus captured interaction coordinates. No session on{" "}
                <strong>{currentSite.name}</strong> has replay data yet — once the SDK sends snapshots to{" "}
                <code>/public/sites/{currentSite.siteId}/replay</code>, this page will populate automatically.
              </>
            }
          />
        </div>
      )}

      {replaySessions && replaySessions.length > 0 && (
        <div className="card card-padded">
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {LAYERS.map((l) => (
              <button
                key={l.id}
                className="btn btn-sm"
                onClick={() => setLayer(l.id)}
                style={
                  layer === l.id
                    ? { background: "var(--observe-dim)", borderColor: "var(--observe)", color: "var(--observe)" }
                    : undefined
                }
              >
                {l.label}
              </button>
            ))}
          </div>

          {renderError && (
            <div className="error-banner" style={{ marginBottom: 16 }}>
              {renderError}
            </div>
          )}

          {!renderError && (!sessionDetail || !snapshotNode) && (
            <div className="skeleton" style={{ width: RENDER_WIDTH, height: renderHeight, maxWidth: "100%" }} />
          )}

          {!renderError && sessionDetail && snapshotNode != null && (
            <div
              style={{
                position: "relative",
                width: RENDER_WIDTH,
                maxWidth: "100%",
                overflow: "hidden",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <RrwebSnapshotFrame
                snapshotNode={snapshotNode as never}
                width={RENDER_WIDTH}
                height={renderHeight}
                onError={setRenderError}
              />
              <HeatmapOverlay
                events={sessionDetail.events}
                layer={layer}
                width={RENDER_WIDTH}
                height={renderHeight}
                capturedViewport={capturedViewport}
              />
            </div>
          )}

          {!capturedViewport && sessionDetail && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10 }}>
              No viewport size was recorded for this session's events — coordinates are shown unscaled and may not
              align precisely with the snapshot.
            </p>
          )}
        </div>
      )}
    </>
  );
}
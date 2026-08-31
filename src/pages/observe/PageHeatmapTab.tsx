import { useEffect, useState } from "react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as pagesApi from "../../api/pages";
import type { HeatmapDevice, HeatmapLayer, PageDetail, PageHeatmapResult, PageHeatmapState } from "../../types/api";

const DEVICES: HeatmapDevice[] = ["desktop", "tablet", "mobile"];
const LAYERS: HeatmapLayer[] = ["click", "hover", "cursor", "scroll"];

function HeatmapCanvas({ result }: { result: PageHeatmapResult }) {
  const snapshot = result.snapshot;
  if (!snapshot) return <div style={{ padding: 28, textAlign: "center", color: "var(--text-secondary)" }}>No reference snapshot for this state and device yet.</div>;
  const max = Math.max(1, ...result.points.map((point) => point.count));
  return (
    <div style={{ position: "relative", width: "min(100%, 960px)", lineHeight: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <img src={snapshot.imageDataUrl} alt={`Heatmap reference for ${snapshot.pagePath}`} style={{ display: "block", width: "100%", height: "auto" }} />
      <svg viewBox={`0 0 ${snapshot.documentWidth} ${snapshot.documentHeight}`} preserveAspectRatio="none" aria-label={`${result.layer} heatmap with ${result.interactionCount} interactions`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        {result.points.map((point, index) => {
          if (result.layer === "scroll" && point.scrollPercent != null) {
            const y = Math.max(0, Math.min(snapshot.documentHeight, snapshot.documentHeight * point.scrollPercent / 100));
            return <line key={index} x1="0" x2={snapshot.documentWidth} y1={y} y2={y} stroke="rgba(239,68,68,.72)" strokeWidth={Math.max(3, snapshot.documentHeight / 300)} />;
          }
          if (point.x == null || point.y == null) return null;
          const strength = point.count / max;
          return <circle key={index} cx={point.x} cy={point.y} r={18 + strength * 34} fill={`rgba(239,68,68,${0.25 + strength * 0.55})`} />;
        })}
      </svg>
    </div>
  );
}

export function PageHeatmapTab({ page, onPageChange }: { page: PageDetail; onPageChange: (page: PageDetail) => void }) {
  const { currentOrg, currentSite } = useWorkspace();
  const [states, setStates] = useState<PageHeatmapState[]>([]);
  const [stateId, setStateId] = useState("default");
  const [device, setDevice] = useState<HeatmapDevice>("desktop");
  const [layer, setLayer] = useState<HeatmapLayer>("click");
  const [result, setResult] = useState<PageHeatmapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capture, setCapture] = useState<{ command: string; expiresAt: string } | null>(null);
  const [stateName, setStateName] = useState("");
  const [selector, setSelector] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    pagesApi.listPageHeatmapStates(currentOrg.orgId, currentSite.id, page.id)
      .then(({ states: next }) => setStates(next))
      .catch(() => setError("Couldn't load Page States."));
  }, [currentOrg, currentSite, page.id]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !page.heatmapEnabled) { setResult(null); return; }
    setResult(null);
    setError(null);
    pagesApi.getPageHeatmap(currentOrg.orgId, currentSite.id, page.id, { stateId, device, layer })
      .then(setResult)
      .catch(() => setError("Couldn't load this heatmap."));
  }, [currentOrg, currentSite, page.id, page.heatmapEnabled, stateId, device, layer]);

  async function toggleEnabled() {
    if (!currentOrg || !currentSite) return;
    setBusy(true);
    try {
      const updated = await pagesApi.updatePage(currentOrg.orgId, currentSite.id, page.id, { heatmapEnabled: !page.heatmapEnabled });
      onPageChange({ ...page, ...updated });
    } catch { setError("Couldn't update the heatmap setting."); }
    finally { setBusy(false); }
  }

  async function addState() {
    if (!currentOrg || !currentSite || !stateName.trim() || !selector.trim()) return;
    setBusy(true);
    try {
      const created = await pagesApi.createPageHeatmapState(currentOrg.orgId, currentSite.id, page.id, { name: stateName.trim(), selector: selector.trim() });
      setStates((current) => [...current, created]);
      setStateId(created.id);
      setStateName(""); setSelector("");
    } catch { setError("Couldn't create this Page State. Use a stable CSS selector."); }
    finally { setBusy(false); }
  }

  async function requestCapture() {
    if (!currentOrg || !currentSite) return;
    setBusy(true); setCapture(null);
    try { setCapture(await pagesApi.requestPageHeatmapCapture(currentOrg.orgId, currentSite.id, page.id, { stateId, device })); }
    catch { setError("Couldn't create a snapshot capture request."); }
    finally { setBusy(false); }
  }

  if (!page.heatmapEnabled) return (
    <div className="card card-padded">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Heatmaps are disabled</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 0 }}>Normal analytics continue to be collected. Enable heatmaps when this Page should have reference snapshots and active analysis.</p>
      <button className="btn btn-primary" disabled={busy} onClick={() => void toggleEnabled()}>Enable heatmaps</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div className="error-banner">{error}</div>}
      <div className="card card-padded">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div className="field"><label>State</label><select className="input" value={stateId} onChange={(event) => { setStateId(event.target.value); setCapture(null); }}>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</select></div>
          <div className="field"><label>Device</label><select className="input" value={device} onChange={(event) => { setDevice(event.target.value as HeatmapDevice); setCapture(null); }}>{DEVICES.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
          <div className="field"><label>Layer</label><select className="input" value={layer} onChange={(event) => setLayer(event.target.value as HeatmapLayer)}>{LAYERS.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
          <button className="btn btn-primary" disabled={busy} onClick={() => void requestCapture()}>{result?.snapshot ? "Replace reference snapshot" : "Capture reference snapshot"}</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => void toggleEnabled()}>Disable heatmaps</button>
        </div>
        {capture && <div style={{ marginTop: 14, padding: 12, background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: 12.5 }}>
          Open the real target page on the selected device, manually open the modal/drawer/tab for this state, then run this in the browser console before the request expires:<br />
          <code className="mono" style={{ display: "block", marginTop: 8, userSelect: "all" }}>{capture.command}</code>
        </div>}
      </div>

      <div className="card card-padded">
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{result ? `${result.interactionCount.toLocaleString()} ${layer} interactions` : "Loading heatmap…"}</div>
        {result && <HeatmapCanvas result={result} />}
      </div>

      <div className="card card-padded">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Add a Page State</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>A state is active while one stable selector is visible. It does not create a new Page.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="input" aria-label="State name" value={stateName} onChange={(event) => setStateName(event.target.value)} placeholder="Create Project Modal" />
          <input className="input mono" aria-label="Visible element selector" value={selector} onChange={(event) => setSelector(event.target.value)} placeholder={'[role="dialog"][data-dialog="create-project"]'} style={{ minWidth: 360, flex: 1 }} />
          <button className="btn btn-ghost" disabled={busy || !stateName.trim() || !selector.trim()} onClick={() => void addState()}>Add state</button>
        </div>
      </div>
    </div>
  );
}

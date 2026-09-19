import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import { Metric, MetricGrid, ErrorNotice } from "../../components/PageSurface";
import { Button, Skeleton } from "@movecues/ui";
import * as pagesApi from "../../api/pages";
import type { HeatmapDateRange, HeatmapDevice, HeatmapLayer, PageDetail, PageHeatmapResult, PageHeatmapState } from "../../types/api";

const DEVICES: HeatmapDevice[] = ["desktop", "tablet", "mobile"];
const LAYERS: { value: HeatmapLayer; label: string }[] = [{ value: "click", label: "Clicks" }, { value: "cursor", label: "Cursor" }, { value: "scroll", label: "Scroll" }, { value: "rage_click", label: "Rage clicks" }, { value: "hover", label: "Hover" }];
type Preset = "7" | "30" | "90" | "custom";

function dateRange(preset: Preset, customFrom: string, customTo: string): HeatmapDateRange {
  const to = customTo ? new Date(`${customTo}T23:59:59.999`) : new Date();
  const from = preset === "custom" && customFrom ? new Date(`${customFrom}T00:00:00.000`) : new Date(to.getTime() - Number(preset === "custom" ? 30 : preset) * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}
function duration(ms: number) { const seconds = Math.round(ms / 1000); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function title(value: string) { return value[0].toUpperCase() + value.slice(1).replace("_", " "); }

function HeatmapCanvas({ result }: { result: PageHeatmapResult }) {
  const snapshot = result.snapshot;
  if (!snapshot) return <div className="py-16 text-center text-sm text-muted-foreground">No reference image yet. Automatic capture will run on the next eligible visit.</div>;
  const max = Math.max(1, ...result.points.map((point) => point.count));
  return <div className="relative mx-auto w-full max-w-[960px] overflow-hidden rounded-lg border leading-none">
    <img src={snapshot.imageDataUrl} alt={`Heatmap reference for ${snapshot.pagePath}`} className="block h-auto w-full" />
    {result.layer === "scroll" ? <div className="absolute inset-0" aria-label="Scroll reach heatmap" style={{ background: `linear-gradient(to bottom, rgba(239,68,68,${result.scrollReach[0]?.reached ?? 0}) 0 25%, rgba(249,115,22,${result.scrollReach[1]?.reached ?? 0}) 25% 50%, rgba(234,179,8,${result.scrollReach[2]?.reached ?? 0}) 50% 75%, rgba(34,197,94,${result.scrollReach[3]?.reached ?? 0}) 75% 100%)` }} /> :
      <svg viewBox={`0 0 ${snapshot.documentWidth} ${snapshot.documentHeight}`} preserveAspectRatio="none" aria-label={`${result.layer} heatmap with ${result.interactionCount} interactions`} className="pointer-events-none absolute inset-0 h-full w-full">
        {result.points.map((point, index) => point.x == null || point.y == null ? null : <circle key={index} cx={point.x} cy={point.y} r={18 + point.count / max * 34} fill={`rgba(239,68,68,${0.25 + point.count / max * 0.55})`} />)}
      </svg>}
  </div>;
}

export function HeatmapDetailPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageDetail | null>(null), [states, setStates] = useState<PageHeatmapState[]>([]), [result, setResult] = useState<PageHeatmapResult | null>(null);
  const [device, setDevice] = useState<HeatmapDevice>("desktop"), [stateId, setStateId] = useState("default"), [layer, setLayer] = useState<HeatmapLayer>("click"), [preset, setPreset] = useState<Preset>("30");
  const [customFrom, setCustomFrom] = useState(""), [customTo, setCustomTo] = useState(""), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false), [captureRequest, setCaptureRequest] = useState<string | null>(null);
  const [stateName, setStateName] = useState(""), [selector, setSelector] = useState("");
  const range = useMemo(() => dateRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => { if (!currentOrg || !currentSite || !pageId) return; pagesApi.getPage(currentOrg.orgId, currentSite.id, pageId).then(setPage).catch(() => setError("Couldn't load this Page.")); pagesApi.listPageHeatmapStates(currentOrg.orgId, currentSite.id, pageId).then((data) => setStates(data.states)).catch(() => setError("Couldn't load Page States.")); }, [currentOrg, currentSite, pageId]);
  const load = useCallback(() => { if (!currentOrg || !currentSite || !pageId || !page?.heatmapEnabled) return; setError(null); pagesApi.getPageHeatmap(currentOrg.orgId, currentSite.id, pageId, { stateId, device, layer, ...range }).then(setResult).catch(() => setError("Couldn't load this heatmap.")); }, [currentOrg, currentSite, pageId, page?.heatmapEnabled, stateId, device, layer, range]);
  useEffect(() => { setResult(null); load(); }, [load]);
  useEffect(() => { if (!captureRequest || !currentOrg || !currentSite || !pageId) return; const timer = window.setInterval(() => { pagesApi.getPageHeatmapCaptureStatus(currentOrg.orgId, currentSite.id, pageId, captureRequest).then(({ status }) => { if (status === "complete") { window.clearInterval(timer); setCaptureRequest(null); load(); } if (status === "expired") { window.clearInterval(timer); setCaptureRequest(null); setError("The live capture request expired."); } }).catch(() => undefined); }, 2000); return () => window.clearInterval(timer); }, [captureRequest, currentOrg, currentSite, pageId, load]);

  async function toggleEnabled() { if (!currentOrg || !currentSite || !page) return; setBusy(true); try { const updated = await pagesApi.updatePage(currentOrg.orgId, currentSite.id, page.id, { heatmapEnabled: !page.heatmapEnabled }); setPage({ ...page, ...updated }); } catch { setError("Couldn't update Heatmaps."); } finally { setBusy(false); } }
  async function openCapture() { if (!currentOrg || !currentSite || !pageId || !result?.targetUrl) return; setBusy(true); try { const capture = await pagesApi.requestPageHeatmapCapture(currentOrg.orgId, currentSite.id, pageId, { stateId, device, targetUrl: result.targetUrl }); window.open(capture.captureUrl, "_blank", "noopener,noreferrer"); setCaptureRequest(capture.requestId); } catch { setError("Couldn't open live capture. Make sure this site's domain is configured and has matching traffic."); } finally { setBusy(false); } }
  async function addState() { if (!currentOrg || !currentSite || !pageId || !stateName.trim() || !selector.trim()) return; setBusy(true); try { const state = await pagesApi.createPageHeatmapState(currentOrg.orgId, currentSite.id, pageId, { name: stateName.trim(), selector: selector.trim() }); setStates((items) => [...items, state]); setStateId(state.id); setStateName(""); setSelector(""); } catch { setError("Couldn't create this Page State."); } finally { setBusy(false); } }

  if (!page) return <><PageHeader section="Observe" title="Heatmap" /><Skeleton className="h-72 w-full" /></>;
  if (!page.heatmapEnabled) return <><PageHeader section="Observe" title={page.name} description="Heatmap" actions={<Button variant="outline" onClick={() => navigate(`/observe/pages/${page.id}`)}>View Page</Button>} />{error && <ErrorNotice>{error}</ErrorNotice>}<div className="rounded-lg border bg-card p-6"><h2 className="font-semibold">Heatmaps are disabled</h2><p className="mt-1 text-sm text-muted-foreground">Enable analysis for this Page. Its existing URL rules remain the source of targeting.</p><Button className="mt-4" disabled={busy} onClick={() => void toggleEnabled()}>Enable heatmap</Button></div></>;

  return <>
    <PageHeader section="Observe" title={page.name} description="Heatmap workspace" actions={<div className="flex gap-2"><Button variant="outline" onClick={() => navigate(`/observe/pages/${page.id}`)}>View Page</Button><Button variant="outline" disabled={busy || !result?.targetUrl} onClick={() => void openCapture()}>Change image</Button></div>} />
    {error && <div className="mb-4"><ErrorNotice>{error}</ErrorNotice></div>}
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <label className="text-xs font-medium">Date range<select className="input mt-1 block" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom</option></select></label>
      {preset === "custom" && <><label className="text-xs font-medium">From<input className="input mt-1 block" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></label><label className="text-xs font-medium">To<input className="input mt-1 block" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></label></>}
      <label className="text-xs font-medium">Device<select className="input mt-1 block" value={device} onChange={(e) => setDevice(e.target.value as HeatmapDevice)}>{DEVICES.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
      <label className="text-xs font-medium">State<select className="input mt-1 block" value={stateId} onChange={(e) => setStateId(e.target.value)}>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</select></label>
      <label className="text-xs font-medium">Layer<select className="input mt-1 block" value={layer} onChange={(e) => setLayer(e.target.value as HeatmapLayer)}>{LAYERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <Button variant="ghost" disabled={busy} onClick={() => void toggleEnabled()}>Disable</Button>
    </div>
    <MetricGrid className="mb-5"><Metric label="Visits" value={(result?.metrics.visits ?? 0).toLocaleString()} /><Metric label="Total clicks" value={(result?.metrics.totalClicks ?? 0).toLocaleString()} /><Metric label="Average time on Page" value={duration(result?.metrics.averageTimeMs ?? 0)} /><Metric label="Drop-off rate" value={`${((result?.metrics.dropOffRate ?? 0) * 100).toFixed(1)}%`} /></MetricGrid>
    <div className="mb-5 rounded-lg border bg-card p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-muted-foreground">{result ? `${result.interactionCount.toLocaleString()} ${LAYERS.find((item) => item.value === layer)?.label.toLowerCase()} interactions` : "Loading heatmap…"}</div>{captureRequest && <span className="text-xs text-muted-foreground">Waiting for live capture…</span>}</div>{result ? <HeatmapCanvas result={result} /> : <Skeleton className="h-72 w-full" />}</div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Top clicked elements</h2>{result?.topClickedElements.length ? <ol className="space-y-3">{result.topClickedElements.map((item) => <li key={item.selector} className="text-sm"><div className="font-medium">{item.label || item.selector}</div><div className="text-xs text-muted-foreground">{item.count.toLocaleString()} clicks · {(item.percentage * 100).toFixed(1)}%</div></li>)}</ol> : <p className="text-sm text-muted-foreground">No clicks in this range.</p>}</section>
      <section className="rounded-lg border bg-card p-4"><h2 className="mb-3 text-sm font-semibold">Scroll reach</h2><div className="space-y-3">{result?.scrollReach.map((item) => <div key={item.depth}><div className="mb-1 flex justify-between text-xs"><span>{item.depth}% depth</span><span>{(item.reached * 100).toFixed(0)}% reached</span></div><div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${item.reached * 100}%` }} /></div></div>)}</div></section>
    </div>
    <section className="mt-5 rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Reference captured</h2><p className="mt-1 text-xs text-muted-foreground">{result?.snapshot ? new Date(result.snapshot.capturedAt).toLocaleString() : "No reference image yet"}</p></div><Button variant="outline" disabled={busy || !result?.targetUrl} onClick={() => void openCapture()}>Open live capture</Button></div></section>
    <details className="mt-5 rounded-lg border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">Add optional Page State</summary><p className="mt-2 text-xs text-muted-foreground">Use a stable selector for a modal, drawer, tab, dropdown, or accordion. Default works without setup.</p><div className="mt-3 flex flex-wrap gap-2"><input className="input" aria-label="State name" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Create project modal" /><input className="input min-w-72 flex-1 font-mono" aria-label="Visible element selector" value={selector} onChange={(e) => setSelector(e.target.value)} placeholder='[role="dialog"]' /><Button variant="outline" disabled={busy || !stateName.trim() || !selector.trim()} onClick={() => void addState()}>Add state</Button></div></details>
  </>;
}

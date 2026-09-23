import type { SessionActivityEvidence, SessionActivityItem } from "../../../types/api";
import { formatDuration, formatTimestamp } from "../../../lib/format";
import { Badge } from "@movecues/ui";
import type { SessionEpisodeViewModel } from "./sessionTimeline";
import { elapsedLabel, episodeSummary } from "./sessionTimeline";

const SIGNAL_LABEL: Record<string, string> = {
  element_approach: "Pointer moved toward an interaction position",
  element_leave: "Pointer moved away from an interaction position",
  reversal: "Pointer direction changes",
  hesitation: "Back-and-forth pointer movement near an interaction position",
  dwell: "Pointer samples remained near an interaction position",
  repeated_attention: "Repeated recorded interactions with this element",
};

const target = (item: SessionActivityItem) => item.element?.label ?? item.element?.role ?? item.element?.selector ?? "an unidentified element";
const relativeTimestamp = (timestamp: string, firstObserved: string) => {
  const milliseconds = Math.max(0, Date.parse(timestamp) - Date.parse(firstObserved));
  if (milliseconds < 1000) return `+${milliseconds}ms`;
  const seconds = Math.floor(milliseconds / 1000);
  return seconds >= 60 ? `+${Math.floor(seconds / 60)}m ${seconds % 60}s` : `+${seconds}s`;
};
const propertyText = (properties?: Record<string, unknown>) => !properties || Object.keys(properties).length === 0 ? "No properties recorded" : JSON.stringify(properties, null, 2);

function Evidence({ evidence }: { evidence?: SessionActivityEvidence }) {
  if (!evidence) return null;
  const values = [evidence.sampleCount != null && `${evidence.sampleCount} pointer samples`, evidence.distanceMoved != null && `${Math.round(evidence.distanceMoved)}px recorded path distance`, evidence.numberOfDirectionChanges != null && `${evidence.numberOfDirectionChanges} direction changes`, evidence.minDistanceToTarget != null && `${Math.round(evidence.minDistanceToTarget)}px nearest recorded proximity`, evidence.maxDistanceToTarget != null && `${Math.round(evidence.maxDistanceToTarget)}px furthest recorded proximity`, evidence.durationMs != null && `${formatDuration(evidence.durationMs)} evidence span`, evidence.sourceEventCount != null && `${evidence.sourceEventCount} best-effort source references`].filter(Boolean);
  return <div className="mt-2 text-xs text-muted-foreground">{values.length > 0 && <div>{values.join(" · ")}</div>}<div className="mt-1">Source references cover the compiler's time window and are not exact causal attribution.</div></div>;
}

function ActivityRow({ item, firstObserved }: { item: SessionActivityItem; firstObserved: string }) {
  const title = item.kind === "click" ? `Clicked ${target(item)}` : item.kind === "custom" ? item.name ?? "Unnamed application event" : item.kind === "long_hover" ? `Long hover on ${target(item)} — ${formatDuration(item.durationMs ?? 0)}` : SIGNAL_LABEL[item.signalKind ?? ""] ?? "Derived pointer signal";
  const badge = item.kind === "custom" ? "Application event" : item.kind === "long_hover" ? "Long hover" : item.kind === "click" ? "Click" : "Derived signal";

  return <details className="relative pb-4 pl-7 last:pb-0"><span aria-hidden className="absolute -left-[5px] top-2.5 size-2.5 rounded-full border-2 border-primary bg-card" /><summary className="flex cursor-pointer list-none flex-wrap items-start gap-x-2.5 gap-y-1 text-sm"><Badge variant={item.kind === "custom" ? "secondary" : "outline"}>{badge}</Badge><span className="min-w-0 flex-1 text-foreground">{title}</span><time className="mono text-xs text-muted-foreground" title={formatTimestamp(item.timestamp)}>{relativeTimestamp(item.timestamp, firstObserved)}</time></summary><div className="pt-2 text-xs text-muted-foreground"><div>Recorded: {formatTimestamp(item.timestamp)}</div>{item.estimatedStartTimestamp && <div>Estimated hover start: {formatTimestamp(item.estimatedStartTimestamp)}</div>}{item.kind === "long_hover" && <div>Duration was reported after pointer leave and was not visibility-verified.</div>}{item.element?.selector && <div className="mono mt-1.5 break-all">Selector: {item.element.selector}</div>}{item.kind === "custom" && <pre className="mono mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{propertyText(item.properties)}</pre>}{item.kind === "derived_signal" && <Evidence evidence={item.evidence} />}</div></details>;
}

function DerivedSignals({ items, firstObserved }: { items: SessionActivityItem[]; firstObserved: string }) {
  return <details className="relative pb-4 pl-7 last:pb-0"><span aria-hidden className="absolute -left-[5px] top-2.5 size-2.5 rounded-full border-2 border-dashed border-primary/70 bg-card" /><summary className="cursor-pointer text-[13px] font-semibold text-foreground">Derived pointer signals ({items.length})</summary><div className="mt-2 text-xs text-muted-foreground">These threshold-qualified summaries are recorded geometry evidence, not proof of intent, frustration, or interest.</div><div className="mt-3 border-l border-border pl-5">{items.map((item) => <ActivityRow key={item.id} item={item} firstObserved={firstObserved} />)}</div></details>;
}

export function SessionEpisodeCard({ episode, firstObserved, active, expanded, onToggle }: { episode: SessionEpisodeViewModel; firstObserved: string; active: boolean; expanded: boolean; onToggle: () => void }) {
  const hasVisible = episode.visibleItems.length > 0;
  const directItems = episode.visibleItems.filter((item) => item.kind !== "derived_signal");
  const derivedSignals = episode.visibleItems.filter((item) => item.kind === "derived_signal");

  const pageLabel = episode.page.pageName ?? episode.page.path ?? "Page visit";

  return <section className="relative pl-10 pb-8" aria-label={`Session activity from ${elapsedLabel(episode.displayStartMs)} to ${elapsedLabel(episode.displayEndMs)}`}><span aria-hidden className="absolute left-[11px] top-6 -bottom-3 w-px bg-border" /><span aria-hidden className={`absolute left-0 top-3 size-6 rounded-full border-2 bg-card ${active ? "border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" : "border-muted-foreground/50"}`}><span className={`absolute inset-[5px] rounded-full ${active ? "bg-primary" : "bg-muted-foreground/40"}`} /></span><div className={`rounded-lg px-4 py-3 transition-colors ${active ? "bg-primary/[0.045]" : "hover:bg-muted/40"}`}><button type="button" className="flex w-full flex-wrap items-start justify-between gap-x-4 gap-y-1 text-left" onClick={onToggle} aria-expanded={expanded}><span className="font-medium text-foreground">{pageLabel}</span><span className="mono text-xs text-muted-foreground">{elapsedLabel(episode.displayStartMs)} – {elapsedLabel(episode.displayEndMs)}</span><span className="w-full text-xs text-muted-foreground">{episodeSummary(episode)}</span></button>{expanded && <div className="relative mt-4 ml-3 border-l border-border pl-5">{hasVisible ? <>{directItems.map((item) => <ActivityRow key={item.id} item={item} firstObserved={firstObserved} />)}{derivedSignals.length > 0 && <DerivedSignals items={derivedSignals} firstObserved={firstObserved} />}</> : <div className="pb-3 text-[13px] text-muted-foreground"><div>{episode.allQualifyingItems.length === 0 ? "No notable activity" : "No activity matches the current filters."}</div>{episode.allQualifyingItems.length === 0 && <div className="mt-1 text-xs">No clicks, application events, long hovers, or derived signals recorded.</div>}</div>}</div>}</div></section>;
}

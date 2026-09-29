import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Eye, MousePointerClick, Plus, Sparkles, Trash2 } from "lucide-react";
import { useWorkspace } from "../../auth/WorkspaceContext";
import * as experiencesApi from "../../api/experiences";
import { getGuideStepPattern, type Experience, type ExperienceAnalytics, type ExperienceDesign, type ExperienceKind, type WidgetBuilderState, type WidgetType } from "../../types/experiences";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { Button } from "@movecues/ui";
import { Badge } from "@movecues/ui";
import { formatRelativeTime } from "../../lib/format";
import { normalizeWidgetSize, WIDGET_SIZE_CONSTRAINTS } from "../../components/experiences/widgetSizing";
import { CreateExperienceModal } from "./CreateExperienceModal";

interface ExperienceListPageProps {
  kind: ExperienceKind;
  widgetType?: WidgetType;
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;
  unsupported?: boolean;
}

export function ExperienceListPage({ kind, widgetType, singularLabel = kind, pluralLabel = kind === "guide" ? "Guides" : "Widgets", description, unsupported = false }: ExperienceListPageProps) {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<Experience[] | null>(null);
  const [analyticsById, setAnalyticsById] = useState<Map<string, ExperienceAnalytics>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (unsupported) {
      setItems([]);
      return;
    }
    if (!currentOrg || !currentSite) return;

    setItems(null);
    setError(null);
    Promise.all([
      experiencesApi.listExperiences(currentOrg.orgId, currentSite.id, kind, widgetType),
      // Performance is useful context, but should never keep a user from editing an experience.
      Promise.resolve(experiencesApi.listExperienceAnalytics(currentOrg.orgId, currentSite.id)).catch(() => ({ experiences: [] })),
    ])
      .then(([experienceList, analyticsList]) => {
        setItems(experienceList.experiences);
        setAnalyticsById(new Map((analyticsList?.experiences ?? []).map(item => [item.experience.id, item])));
      })
      .catch(() => setError(`Couldn't load ${pluralLabel.toLowerCase()}.`));
  }, [currentOrg, currentSite, kind, pluralLabel, unsupported, widgetType]);

  useEffect(load, [load]);

  async function toggle(item: Experience) {
    if (!currentOrg || !currentSite) return;
    try {
      if (item.status === "published") await experiencesApi.pauseExperience(currentOrg.orgId, currentSite.id, item.id);
      else await experiencesApi.publishExperience(currentOrg.orgId, currentSite.id, item.id);
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    }
  }

  async function remove(item: Experience) {
    if (!currentOrg || !currentSite || !window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    setError(null);
    try {
      await experiencesApi.deleteExperience(currentOrg.orgId, currentSite.id, item.id);
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Couldn't delete ${singularLabel.toLowerCase()}.`);
    } finally {
      setDeletingId(null);
    }
  }

  const collectionDescription = description ?? (kind === "guide" ? "Build multi-step anchored guidance over your real product." : `Deliver ${pluralLabel.toLowerCase()} inside your product.`);
  return <>
    <PageHeader section="Experiences" title={pluralLabel} description={collectionDescription} actions={!unsupported ? <Button onClick={() => setCreating(true)}><Plus />Create {singularLabel}</Button> : undefined} />
    <DataTableFrame className="shadow-sm">
      {unsupported ? <EmptyState icon={<Sparkles />} title="Checklists are not available yet." description="Checklist runtime support has not been implemented, so no checklist experiences can be created or shown here yet." /> : <>
        {error && <div className="p-4"><ErrorNotice>{error}</ErrorNotice></div>}
        {!error && items === null && <LoadingRows count={3} />}
        {!error && items?.length === 0 && <EmptyState icon={<Sparkles />} title={`Create your first ${singularLabel}.`} description={`Design and target a ${singularLabel} directly on your real application.`} action={<Button className="mt-3" onClick={() => setCreating(true)}>Create {singularLabel}</Button>} />}
        {!error && items && items.length > 0 && <>
          <div className="space-y-3 p-3 md:hidden">{items.map(item => <MobileExperienceCard key={item.id} item={item} analytics={analyticsById.get(item.id)} deleting={deletingId === item.id} onEdit={() => navigate(`/experiences/${item.id}/edit`)} onResults={item.widgetType === "survey" ? () => navigate(`/experiences/${item.id}/results`) : undefined} onToggle={() => void toggle(item)} onRemove={() => void remove(item)} />)}</div>
          {widgetType === "survey" ? <table className={`${dataTableClass} hidden min-w-[920px] md:table`}>
            <thead><tr><th className="w-[152px]">Preview</th><th>Name</th><th>Status</th><th className="text-right">Responses</th><th className="text-right">Response rate</th><th>Updated</th><th>Actions</th></tr></thead>
            <tbody>{items.map(item => { const analytics = analyticsById.get(item.id)?.survey; return <tr key={item.id}><td className="py-2!"><WidgetPreview item={item} /></td><td><button type="button" className="font-medium text-foreground hover:text-primary" onClick={() => navigate(`/experiences/${item.id}/edit`)}>{item.name}</button></td><td><StatusBadge status={item.status} /></td><td className="text-right font-mono">{(analytics?.responseCount ?? analytics?.submitted ?? 0).toLocaleString()}</td><td className="text-right font-mono">{analytics ? `${analytics.responseRate}%` : "—"}</td><td className="whitespace-nowrap text-muted-foreground">{formatRelativeTime(item.updatedAt)}</td><td><div className="flex gap-1"><Button size="sm" onClick={() => navigate(`/experiences/${item.id}/results`)}>View Results</Button><Button variant="ghost" size="sm" onClick={() => navigate(`/experiences/${item.id}/edit`)}>Build</Button><Button variant="ghost" size="sm" onClick={() => void toggle(item)}>{item.status === "published" ? "Pause" : "Publish"}</Button><Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${item.name}`} disabled={deletingId === item.id} onClick={() => void remove(item)}><Trash2 /></Button></div></td></tr>; })}</tbody>
          </table> : <table className={`${dataTableClass} hidden min-w-[930px] md:table`}>
          <thead><tr><th className="w-[152px]">Preview</th><th>Experience</th><th className="w-[250px]">Performance</th><th>Targeting</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id}>
            <td className="py-2!"><WidgetPreview item={item} /></td>
            <td>
              <button type="button" className="group block text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(`/experiences/${item.id}/edit`)}>
                <span className="block font-medium text-foreground group-hover:text-primary">{item.name}</span>
                <span className="mt-1 block text-xs capitalize text-muted-foreground">{experienceType(item)}</span>
              </button>
              <div className="mt-2"><StatusBadge status={item.status} /></div>
            </td>
            <td><PerformanceMetrics analytics={analyticsById.get(item.id)} item={item} /></td>
            <td className="text-muted-foreground">{targetingLabel(item)}</td>
            <td className="whitespace-nowrap text-muted-foreground">{formatRelativeTime(item.updatedAt)}</td>
            <td><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => navigate(`/experiences/${item.id}/edit`)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => void toggle(item)}>{item.status === "published" ? "Pause" : "Publish"}</Button><Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${item.name}`} disabled={deletingId === item.id} onClick={() => void remove(item)}><Trash2 /></Button></div></td>
          </tr>)}</tbody>
          </table>}
        </>}
      </>}
    </DataTableFrame>
    {!unsupported && <CreateExperienceModal kind={kind} widgetType={widgetType} singularLabel={singularLabel} open={creating} onOpenChange={setCreating} onCreated={load} />}
  </>;
}

function StatusBadge({ status }: { status: Experience["status"] }) {
  const label = status === "published" ? "Live" : status[0].toUpperCase() + status.slice(1);
  return <Badge variant="outline" className={status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "paused" ? "border-amber-200 bg-amber-50 text-amber-700" : ""}>{label}</Badge>;
}

function MobileExperienceCard({ item, analytics, deleting, onEdit, onResults, onToggle, onRemove }: { item: Experience; analytics?: ExperienceAnalytics; deleting: boolean; onEdit: () => void; onResults?: () => void; onToggle: () => void; onRemove: () => void }) {
  return <article className="rounded-lg border bg-card p-3 shadow-sm">
    <div className="flex gap-3">
      <WidgetPreview item={item} />
      <div className="min-w-0 flex-1">
        <button type="button" className="block max-w-full truncate text-left font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onEdit}>{item.name}</button>
        <p className="mt-0.5 text-xs capitalize text-muted-foreground">{experienceType(item)}</p>
        <div className="mt-2"><StatusBadge status={item.status} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{targetingLabel(item)} · Updated {formatRelativeTime(item.updatedAt)}</p>
      </div>
    </div>
    <div className="mt-3 border-t pt-3"><PerformanceMetrics analytics={analytics} item={item} /></div>
    <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2">
      {onResults && <Button size="sm" onClick={onResults}>View Results</Button>}
      <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
      <Button variant="ghost" size="sm" onClick={onToggle}>{item.status === "published" ? "Pause" : "Publish"}</Button>
      <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${item.name}`} disabled={deleting} onClick={onRemove}><Trash2 /></Button>
    </div>
  </article>;
}

function PerformanceMetrics({ analytics, item }: { analytics?: ExperienceAnalytics; item: Experience }) {
  const views = analytics?.summary.usersSeen ?? 0;
  const engaged = analytics?.summary.usersStarted ?? 0;
  const completed = analytics ? analytics.survey?.responseCount ?? analytics.survey?.submitted ?? analytics.checklist?.usersCompleted ?? analytics.summary.completed : 0;
  const completionLabel = item.widgetType === "survey" ? "Submitted" : item.kind === "checklist" ? "Completed" : "Finished";
  const engagementRate = views ? Math.round(engaged / views * 1000) / 10 : 0;
  const rate = analytics ? analytics.survey?.responseRate ?? analytics.checklist?.completionRate ?? analytics.summary.completionRate : 0;
  return <div className="grid grid-cols-3 gap-2" aria-label={`Performance for ${item.name}`}>
    <Metric icon={<Eye />} label="Views" value={views} />
    <Metric icon={<MousePointerClick />} label="Engaged" value={engaged} detail={`${engagementRate}%`} />
    <Metric icon={<CheckCheck />} label={completionLabel} value={completed} detail={`${rate}%`} />
  </div>;
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail?: string }) {
  return <div className="min-w-0 rounded-md bg-muted/55 px-2 py-2" title={`${label}: ${value.toLocaleString()}`}>
    <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{icon}<span>{label}</span></div>
    <div className="mt-1 flex items-baseline gap-1"><span className="text-sm font-semibold tabular-nums text-foreground">{value.toLocaleString()}</span>{detail && <span className="text-[10px] text-muted-foreground">{detail}</span>}</div>
  </div>;
}

function WidgetPreview({ item }: { item: Experience }) {
  const source = previewSource(item);
  const scale = previewScale(source);
  return <div className="w-[128px] overflow-hidden rounded-md border bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
    <div className="flex h-4 items-center gap-1 border-b bg-white px-2" aria-hidden="true"><i className="size-1 rounded-full bg-slate-300" /><i className="size-1 rounded-full bg-slate-300" /><i className="size-1 rounded-full bg-slate-300" /></div>
    <div className="h-[64px] overflow-hidden">
      <iframe title={`Preview of ${item.name}`} sandbox="" loading="lazy" className="block border-0 bg-slate-50" style={{ width: `${100 / scale}%`, height: `${64 / scale}px`, transform: `scale(${scale})`, transformOrigin: "top left" }} srcDoc={previewDocument(source)} />
    </div>
  </div>;
}

type PreviewSource = { mode: "authored"; builder?: WidgetBuilderState; previewWidth?: number; heading: string; body: string; action?: string }
  | { mode: "guide"; builder?: WidgetBuilderState; previewWidth?: number; heading: string; body: string; action?: string; steps: number; theme: { background: string; foreground: string; primary: string; borderRadius: "sm" | "md" | "lg" } }
  | { mode: "checklist"; builder?: WidgetBuilderState; previewWidth?: number; heading: string; body: string; items: number };

function previewSource(item: Experience): PreviewSource {
  const definition = (item.draftVersion ?? item.publishedVersion)?.definition;
  if (!definition) return { mode: "authored", heading: item.name, body: "No content added yet." };
  if ("steps" in definition) {
    const step = definition.steps[0];
    if (!step) return { mode: "guide", heading: item.name, body: "No content added yet.", steps: 0, theme: definition.design.theme };
    const widgetType = getGuideStepPattern(step);
    const design = step.size ? { ...definition.design, size: step.size } : definition.design;
    return { mode: "guide", builder: step.builder, previewWidth: widgetPreviewWidth(widgetType, design), heading: step.content.heading, body: step.content.body, action: step.content.primaryAction?.label, steps: definition.steps.length, theme: definition.design.theme };
  }
  if ("items" in definition) return { mode: "checklist", builder: definition.builder, previewWidth: builderPreviewWidth(definition.builder, 360), heading: definition.title, body: definition.description ?? "", items: definition.items.length };
  const surveyStep = definition.survey?.steps[0];
  const design = surveyStep?.size ? { ...definition.design, size: surveyStep.size } : definition.design;
  return { mode: "authored", builder: surveyStep?.builder ?? definition.builder, previewWidth: item.widgetType ? widgetPreviewWidth(item.widgetType, design) : undefined, heading: surveyStep?.content.heading ?? definition.content.heading, body: surveyStep?.content.body ?? definition.content.body, action: definition.survey?.submitLabel ?? definition.content.primaryAction?.label };
}

function previewScale(source: PreviewSource) {
  if (source.builder && source.previewWidth) return Math.min(0.4, 112 / source.previewWidth);
  return source.mode === "authored" ? 0.4 : 1;
}

function widgetPreviewWidth(widgetType: WidgetType, design: Pick<ExperienceDesign, "width" | "size">) {
  const normalizedSize = normalizeWidgetSize(widgetType, design);
  const defaultWidth = WIDGET_SIZE_CONSTRAINTS[widgetType].width.default;
  return normalizedSize.width.mode === "fixed" ? normalizedSize.width.value : typeof defaultWidth === "number" ? defaultWidth : undefined;
}

function builderPreviewWidth(builder: WidgetBuilderState, fallback: number) {
  const rootRule = builder.css.match(/(?:^|})\s*\.movecues-widget\s*\{([^}]*)\}/i)?.[1] ?? "";
  const width = Number(rootRule.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1]);
  return Number.isFinite(width) && width > 0 ? width : fallback;
}

function previewDocument(source: PreviewSource) {
  const markup = previewMarkup(source);
  const authoredCss = ("builder" in source ? source.builder?.css : "")?.replaceAll("</style", "<\\/style") ?? "";
  const previewStateCss = source.mode === "checklist" && source.builder ? '#movecues-preview-root [data-movecues-checklist-view]{display:none!important}#movecues-preview-root [data-movecues-checklist-view="expanded"]{display:block!important}' : "";
  return `<!doctype html><html><head><style>
    html,body{width:100%;height:100%;margin:0;overflow:hidden}body{display:grid;place-items:center;background:#f8fafc;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,sans-serif}#movecues-preview-root{width:100%;height:100%;display:grid;place-items:center;overflow:hidden}.movecues-list-fallback{width:min(100%,280px);box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:13px;box-shadow:0 4px 14px rgba(15,23,42,.08)}.movecues-list-fallback h2{margin:0 0 5px;font-size:14px;line-height:1.25}.movecues-list-fallback p{margin:0;color:#64748b;font-size:10px;line-height:1.4}.movecues-list-fallback button{margin-top:10px;border:0;border-radius:6px;background:#4f46e5;color:#fff;padding:5px 8px;font:600 10px inherit}.movecues-list-guide{box-sizing:border-box;display:flex;height:calc(100% - 12px);width:calc(100% - 12px);flex-direction:column;justify-content:center;overflow:hidden;padding:8px;box-shadow:0 2px 8px rgba(15,23,42,.12)}.movecues-list-guide__eyebrow,.movecues-list-checklist__eyebrow{margin:0 0 3px;font-size:6px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;opacity:.72}.movecues-list-guide h2,.movecues-list-checklist h2{margin:0;overflow:hidden;font-size:11px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.movecues-list-guide p,.movecues-list-checklist p{margin:3px 0 0;overflow:hidden;font-size:7px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap;opacity:.75}.movecues-list-guide__footer{display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:6px;font-weight:700}.movecues-list-guide__button{border-radius:4px;padding:3px 5px}.movecues-list-checklist{box-sizing:border-box;width:calc(100% - 12px);padding:8px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.08)}.movecues-list-checklist__items{display:flex;gap:3px;margin-top:6px}.movecues-list-checklist__item{height:4px;flex:1;border-radius:99px;background:#e2e8f0}.movecues-list-checklist__item:first-child{background:#6366f1}
    ${authoredCss}
    ${previewStateCss}
  </style></head><body><div id="movecues-preview-root">${markup}</div></body></html>`;
}

function previewMarkup(source: PreviewSource) {
  if (source.mode === "guide") {
    if (source.builder?.html) return source.builder.html;
    const background = previewColor(source.theme.background, "#ffffff");
    const foreground = previewColor(source.theme.foreground, "#0f172a");
    const primary = previewColor(source.theme.primary, "#4f46e5");
    const radius = source.theme.borderRadius === "sm" ? "5px" : source.theme.borderRadius === "lg" ? "12px" : "8px";
    return `<section class="movecues-list-guide" style="background:${background};color:${foreground};border-radius:${radius}"><p class="movecues-list-guide__eyebrow">Guide · Step 1 of ${source.steps}</p><h2>${escapeHtml(source.heading)}</h2><p>${escapeHtml(source.body)}</p><div class="movecues-list-guide__footer"><span>${source.steps} step${source.steps === 1 ? "" : "s"}</span>${source.action ? `<span class="movecues-list-guide__button" style="background:${primary};color:#fff">${escapeHtml(source.action)}</span>` : ""}</div></section>`;
  }
  if (source.mode === "checklist") return source.builder?.html || `<section class="movecues-list-checklist"><p class="movecues-list-checklist__eyebrow">Checklist</p><h2>${escapeHtml(source.heading)}</h2><p>${escapeHtml(source.body || `${source.items} tasks to complete`)}</p><div class="movecues-list-checklist__items">${Array.from({ length: Math.min(Math.max(source.items, 1), 4) }, () => '<i class="movecues-list-checklist__item"></i>').join("")}</div></section>`;
  return source.builder?.html || `<section class="movecues-list-fallback"><h2>${escapeHtml(source.heading)}</h2><p>${escapeHtml(source.body)}</p>${source.action ? `<button>${escapeHtml(source.action)}</button>` : ""}</section>`;
}

function previewColor(value: string, fallback: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

function targetingLabel(item: Experience) {
  const definition = (item.draftVersion ?? item.publishedVersion)?.definition;
  const count = definition?.targeting.pageRules.length ?? 0;
  return count ? `${count} page rule${count === 1 ? "" : "s"}` : "All pages";
}

function experienceType(item: Experience) {
  if (item.kind === "guide") return "Guide";
  if (item.kind === "checklist") return "Checklist";
  return (item.widgetType ?? "Widget").replaceAll("_", " ");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char] ?? char);
}

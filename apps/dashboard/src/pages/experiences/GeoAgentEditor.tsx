import { Suspense, useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from "@movcues/ui";
import { MessageCircle } from "lucide-react";
import * as experiences from "@/api/experiences";
import { GeoAgentSkills, SkillPreviewDiagnostics } from "./GeoAgentSkills";
import { getGeoAgentMetrics, previewGeoAgent } from "@/api/geoAgent";
import { knowledgeApi, type KnowledgeSource } from "@/api/knowledge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorNotice, Metric, MetricGrid } from "@/components/PageSurface";
import { AudienceTargeting } from "@/components/experiences/AudienceTargeting";
import type { Segment } from "@/types/api";
import type { Experience } from "@/types/experiences";
import type { GeoAgentConfig, GeoAgentDefinition, GeoAgentMetrics, GeoAgentPreviewResult } from "@/types/geoAgent";
import { geoAgentPages, type GeoAgentSection } from "@/lib/geoAgentNavigation";

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const errors: Record<string, string> = {
  invalid_geo_agent_sources: "Each selected source must be enabled and available to visitors before publishing.",
  geo_agent_verified_identity_required: "Add your Ed25519 public key to use segment targeting.",
  invalid_geo_agent_skills: "Remove unavailable skills from the widget before saving.",
  preview_visitor_context_required: "Enter a full URL for the visitor simulation.",
  invalid_visitor_identity: "The signed visitor identity could not be verified.",
  draft_conflict: "This draft changed elsewhere. Reload to get the latest saved revision.",
  reviewed_draft_changed: "This draft changed after review. Reload and review it again.",
};
const explain = (error: unknown) => error instanceof Error ? errors[error.message] ?? error.message : "Something went wrong. Try again.";

export function GeoAgentEditor({ experience, initial, orgId, siteId, segments, editable, dashboard }: {
  experience: Experience; initial: GeoAgentDefinition; orgId: string; siteId: string; segments: Segment[]; editable: boolean;
  dashboard?: {
    siteName: string;
    section: GeoAgentSection;
    KnowledgePage: ComponentType<{ agentSettings?: (sources: KnowledgeSource[]) => ReactNode }>;
    hasOtherAgents: boolean;
    hasOtherPublishedAgent: boolean;
    segmentError: boolean;
  };
}) {
  const [saved, setSaved] = useState(experience);
  const [definition, setDefinition] = useState(initial);
  const [legacySection, setLegacySection] = useState<GeoAgentSection>("appearance");
  const section = dashboard?.section ?? legacySection;
  const [sources, setSources] = useState<KnowledgeSource[] | null>(null);
  const [metrics, setMetrics] = useState<GeoAgentMetrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ draftVersionId: string; revision: number } | null>(null);
  const [question, setQuestion] = useState("");
  const [preview, setPreview] = useState<GeoAgentPreviewResult | null>(null);
  const [mode, setMode] = useState<"admin" | "visitor">("admin");
  const [visitorUrl, setVisitorUrl] = useState("");
  const [identityToken, setIdentityToken] = useState("");
  const [priorQuestion, setPriorQuestion] = useState("");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
  const { geoAgent: config, targeting } = definition;
  const { appearance } = config;
  const dirty = JSON.stringify(saved.draftVersion?.definition) !== JSON.stringify(definition);
  const identityNeeded = targeting.audience.type !== "all";
  const launcherVisible = config.enabled && config.showLauncher;
  const showsPreview = section === "overview" || section === "appearance";
  const KnowledgePage = dashboard?.KnowledgePage;
  const pageTitle = dashboard && section !== "overview" ? geoAgentPages.find(page => page.id === section)?.label : experience.name;
  const pageDescription = dashboard?.siteName ?? "Configure your customer-facing assistant.";
  const avatar = useMemo(() => {
    try { const url = new URL(appearance.avatarUrl ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  }, [appearance.avatarUrl]);
  const style = appearance.theme === "dark" ? "border-slate-700 bg-slate-900 text-white" : "bg-card text-card-foreground";

  useEffect(() => {
    if (!editable || section !== "knowledge" || KnowledgePage) return;
    const controller = new AbortController();
    void knowledgeApi(orgId, siteId).list(controller.signal).then(result => {
      if (!controller.signal.aborted) setSources(result);
    }).catch(error => { if (!controller.signal.aborted) setError(explain(error)); });
    return () => controller.abort();
  }, [editable, orgId, siteId, section, KnowledgePage]);

  useEffect(() => {
    if (!editable || section !== "conversations") return;
    const controller = new AbortController();
    setMetricsError(false);
    void getGeoAgentMetrics(orgId, siteId, experience.id).then(result => {
      if (!controller.signal.aborted) setMetrics(result);
    }).catch(() => { if (!controller.signal.aborted) setMetricsError(true); });
    return () => controller.abort();
  }, [editable, orgId, siteId, experience.id, section]);

  function changeConfig(patch: Partial<GeoAgentConfig>) {
    setDefinition(current => ({ ...current, geoAgent: { ...current.geoAgent, ...patch } }));
  }
  function changeAppearance(patch: Partial<GeoAgentConfig["appearance"]>) {
    setDefinition(current => ({ ...current, geoAgent: { ...current.geoAgent, appearance: { ...current.geoAgent.appearance, ...patch } } }));
  }
  function changeTargeting(patch: Partial<GeoAgentDefinition["targeting"]>) {
    setDefinition(current => ({ ...current, targeting: { ...current.targeting, ...patch } }));
  }

  async function saveDraft() {
    const draft = saved.draftVersion;
    if (!draft) throw new Error("Draft not found.");
    if (!dirty) return draft;
    const response = await experiences.updateExperience(orgId, siteId, saved.id, { definition, revision: draft.revision });
    if (!response.draftVersion || !("geoAgent" in response.draftVersion.definition)) throw new Error("Draft not found.");
    setSaved(response);
    setDefinition(response.draftVersion.definition);
    return response.draftVersion;
  }
  async function apply(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  async function test(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || testing) return;
    setTesting(true);
    setTestError("");
    setPreview(null);
    try {
      setPreview(await previewGeoAgent(orgId, siteId, experience.id, config, question, {
        mode, priorQuestion: priorQuestion.trim() || undefined,
        ...(mode === "visitor" ? { url: visitorUrl.trim(), targeting, identityToken: identityToken.trim() || undefined } : {}),
      }));
    }
    catch (failure) { setTestError(explain(failure)); }
    finally { setTesting(false); }
  }

  function knowledgeSettings(availableSources: KnowledgeSource[]) {
    return <fieldset disabled={!editable || busy} className="mt-6 grid gap-5 rounded-lg border bg-card p-4 sm:p-6">
      <div><h2 className="text-base font-semibold">Agent knowledge settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose sources that have visitor access. {!KnowledgePage && <Link className="font-medium text-foreground underline underline-offset-4" to="/knowledge">Manage sources</Link>}</p></div>
      {availableSources.filter(source => source.visibility === "public" || config.sourceIds.includes(source.id)).map(source => {
        const checked = config.sourceIds.includes(source.id);
        const available = source.enabled && source.visibility === "public";
        return <label key={source.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
          <Checkbox checked={checked} disabled={!checked && !available} onCheckedChange={value => changeConfig({ sourceIds: value === true ? [...config.sourceIds, source.id] : config.sourceIds.filter(id => id !== source.id) })} />
          {source.name} <span className="text-xs text-muted-foreground">{available ? source.status : "Unavailable"}</span>
        </label>;
      })}
      {config.sourceIds.filter(id => !availableSources.some(source => source.id === id)).map(id => <Button key={id} variant="outline" size="sm" onClick={() => changeConfig({ sourceIds: config.sourceIds.filter(sourceId => sourceId !== id) })}>Remove unavailable source</Button>)}
      <Label className="grid gap-1.5">Tone and presentation instructions<Textarea value={config.instructions} maxLength={1500} onChange={event => changeConfig({ instructions: event.target.value })} /></Label>
      <Label className="grid gap-1.5">Fallback reply<Textarea value={config.fallback} maxLength={350} onChange={event => changeConfig({ fallback: event.target.value })} /></Label>
    </fieldset>;
  }

  const actions = <div className="flex flex-wrap items-center gap-2">
    <Badge variant="outline" className="capitalize">{saved.status === "published" ? "Live" : saved.status}</Badge>
    {saved.status === "published" && editable && <Button variant="outline" disabled={busy} onClick={() => void apply(async () => {
      setSaved(await experiences.pauseExperience(orgId, siteId, saved.id));
      setNotice("Geo Agent paused.");
    })}>Pause</Button>}
    <Button variant="outline" disabled={!editable || !dirty || busy} onClick={() => void apply(async () => { await saveDraft(); setNotice("Draft saved."); })}>Save draft</Button>
    <Button disabled={!editable || busy} onClick={() => void apply(async () => {
      const draft = await saveDraft();
      setReview({ draftVersionId: draft.id, revision: draft.revision });
    })}>Review &amp; publish</Button>
  </div>;

  return <div className={dashboard ? undefined : "relative mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>
    {!dashboard && <div className="pointer-events-none absolute right-8 top-5 hidden lg:flex"><img src="/movcues_logo.png" alt="movcues" className="h-8 w-auto object-contain" /></div>}
    {KnowledgePage && section === "knowledge" ? editable && <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-medium">{experience.name}</span>{actions}
    </div> : <PageHeader section="Experiences" title={pageTitle} description={pageDescription} actions={actions} />}
    {!dashboard && <nav className="mb-5 flex flex-wrap gap-2" aria-label="Agent management">
      {geoAgentPages.filter(page => page.id !== "knowledge" || editable).map(page => <Button type="button" key={page.id} variant={section === page.id ? "outline" : "ghost"}
        aria-current={section === page.id ? "page" : undefined} onClick={() => setLegacySection(page.id)}>{page.label}</Button>)}
    </nav>}
    {error && !review && <ErrorNotice>{error}</ErrorNotice>}{notice && <p role="status" className="my-2 text-sm">{notice}</p>}
    {!editable && <p className="my-2 text-sm text-muted-foreground">Workspace administrators can edit and publish this widget.</p>}
    {section === "knowledge" && (KnowledgePage ? <Suspense fallback={<p role="status">Loading knowledge…</p>}>
      <KnowledgePage agentSettings={knowledgeSettings} />
    </Suspense> : sources ? knowledgeSettings(sources) : !error && <p role="status">Loading knowledge…</p>)}
    <div className={showsPreview ? "grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,320px)]" : undefined}>
      {section === "overview" && <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-6" aria-label="Agent overview">
        <h2 className="text-base font-semibold">Overview</h2>
        <MetricGrid className="lg:grid-cols-3">
          <Metric label="Knowledge sources" value={config.sourceIds.length} />
          <Metric label="Skills" value={config.skillIds?.length ?? 0} />
          <Metric label="Page targeting" value={targeting.pageRules.length || "All pages"} />
        </MetricGrid>
        {dashboard?.hasOtherAgents && <p className="text-sm text-muted-foreground">This site also has legacy agents. When targeting overlaps, visitors see one eligible launcher based on delivery priority and agent ID.</p>}
      </section>}
      {section === "appearance" && <fieldset disabled={!editable || busy} className="grid min-w-0 gap-5 rounded-lg border bg-card p-4 sm:p-6">
        <div><h2 className="text-base font-semibold">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Customize how your assistant looks and greets visitors.</p></div>
        <Label className="grid gap-1.5">Assistant name<Input maxLength={60} value={appearance.name} onChange={event => changeAppearance({ name: event.target.value })} /></Label>
        <Label className="grid gap-1.5">Avatar URL<Input type="url" value={appearance.avatarUrl ?? ""} placeholder="https://…" onChange={event => changeAppearance({ avatarUrl: event.target.value || undefined })} /></Label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Label className="grid gap-1.5">Brand color<Input type="color" value={appearance.brandColor} onChange={event => changeAppearance({ brandColor: event.target.value })} /></Label>
          <Label className="grid gap-1.5">Theme<select className={selectClass} value={appearance.theme} onChange={event => changeAppearance({ theme: event.target.value as typeof appearance.theme })}><option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option></select></Label>
          <Label className="grid gap-1.5">Launcher style<select className={selectClass} value={appearance.launcher} onChange={event => changeAppearance({ launcher: event.target.value as typeof appearance.launcher })}><option value="icon">Icon</option><option value="label">Label</option></select></Label>
          <Label className="grid gap-1.5">Launcher position<select className={selectClass} value={appearance.position} onChange={event => changeAppearance({ position: event.target.value as typeof appearance.position })}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></Label>
        </div>
        {appearance.launcher === "label" && <Label className="grid gap-1.5">Launcher label<Input value={appearance.launcherLabel} maxLength={35} onChange={event => changeAppearance({ launcherLabel: event.target.value })} /></Label>}
        <Label className="grid gap-1.5">Welcome message<Textarea value={appearance.welcome} maxLength={500} onChange={event => changeAppearance({ welcome: event.target.value })} /></Label>
        <Label className="grid gap-1.5">Input placeholder<Input value={appearance.placeholder} maxLength={80} onChange={event => changeAppearance({ placeholder: event.target.value })} /></Label>
        <Label className="grid gap-1.5">Suggested questions, one per line<Textarea key={saved.draftVersion?.revision} defaultValue={appearance.suggestions.join("\n")} maxLength={605} onChange={event => changeAppearance({ suggestions: event.target.value.split("\n").map(value => value.trim().slice(0, 120)).filter(Boolean).slice(0, 5) })} /></Label>
      </fieldset>}
      {section === "skills" && <fieldset disabled={!editable || busy} className="min-w-0 rounded-lg border bg-card p-4 sm:p-6">
        <GeoAgentSkills orgId={orgId} siteId={siteId} selected={config.skillIds ?? []} onChange={skillIds => changeConfig({ skillIds })} editable={editable} />
      </fieldset>}
      {section === "behaviour" && <fieldset disabled={!editable || busy} className="grid min-w-0 gap-5 rounded-lg border bg-card p-4 sm:p-6">
        <div><h2 className="text-base font-semibold">Behaviour and targeting</h2><p className="mt-1 text-sm text-muted-foreground">Control where the assistant appears and who can see it.</p></div>
        {dashboard?.segmentError && <ErrorNotice>Couldn’t load saved segments. Reload to try again.</ErrorNotice>}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.enabled} onCheckedChange={value => changeConfig({ enabled: value === true })} />Enable Geo Agent</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.showLauncher} onCheckedChange={value => changeConfig({ showLauncher: value === true })} />Show launcher</label>
        <Label className="grid gap-1.5">Remember conversation<select className={selectClass} value={config.persistence} onChange={event => changeConfig({ persistence: event.target.value as GeoAgentConfig["persistence"] })}><option value="tab">Across pages in this tab</option><option value="page">On this page only</option></select></Label>
        <Label className="grid gap-1.5">Page paths, one per line<Textarea key={saved.draftVersion?.revision} defaultValue={targeting.pageRules.map(rule => rule.value).join("\n")} placeholder="All pages when empty" onChange={event => changeTargeting({ pageRules: event.target.value.split("\n").map(path => path.trim()).filter(Boolean).slice(0, 30).map((value, index) => ({ id: `geo-page-${index + 1}`, kind: "include", operator: "starts_with", value })) })} /></Label>
        <AudienceTargeting audience={targeting.audience} segments={segments} onChange={audience => changeTargeting({ audience })} />
        <Label className="grid gap-1.5">Visitor identity public key{identityNeeded ? " (required for this audience)" : " (optional)"}
          <Textarea value={config.identityPublicKey ?? ""} maxLength={512} placeholder="-----BEGIN PUBLIC KEY-----" onChange={event => changeConfig({ identityPublicKey: event.target.value || undefined })} /></Label>
      </fieldset>}
      {showsPreview && <section className="min-w-0 space-y-4 rounded-lg border bg-card p-4 sm:p-5" aria-label="Widget preview">
        <div><h2 className="text-base font-semibold">Live preview</h2><p className="mt-1 text-sm text-muted-foreground">Preview and test your assistant privately.</p></div>
        <div className={`min-w-0 space-y-4 rounded-lg border p-4 shadow-sm ${style}`} style={{ borderTopColor: appearance.brandColor, borderTopWidth: 3 }}>
          <div className="flex items-center gap-2 font-medium">{avatar ? <img className="size-7 rounded-full object-cover" alt="" referrerPolicy="no-referrer" src={avatar} /> : <MessageCircle className="size-4" />}{appearance.name}</div>
          <p className="whitespace-pre-wrap break-words text-sm">{appearance.welcome}</p>
          {appearance.suggestions.length > 0 && <div className="flex flex-wrap gap-1">{appearance.suggestions.map((suggestion, index) => <Button key={index} size="sm" variant="outline" onClick={() => setQuestion(suggestion)}>{suggestion}</Button>)}</div>}
          {editable && <details className="text-sm">
            <summary className="cursor-pointer font-medium">Test context</summary>
            <div className="mt-2 grid gap-2">
              <Label className="grid gap-1.5">Preview mode<select className={selectClass} value={mode} onChange={event => { setMode(event.target.value as typeof mode); setPreview(null); }}>
                <option value="admin">Admin diagnostics</option><option value="visitor">Simulated visitor</option>
              </select></Label>
              {mode === "visitor" && <>
                <Label className="grid gap-1.5">Visitor page URL<Input type="url" maxLength={2048} placeholder="https://your-app.example/settings" value={visitorUrl} onChange={event => setVisitorUrl(event.target.value)} /></Label>
                <Label className="grid gap-1.5">Signed visitor identity (optional)<Input type="password" autoComplete="off" maxLength={4000} value={identityToken} onChange={event => setIdentityToken(event.target.value)} /></Label>
              </>}
              <Label className="grid gap-1.5">Previous question (optional)<Input maxLength={1000} value={priorQuestion} onChange={event => setPriorQuestion(event.target.value)} /></Label>
            </div>
          </details>}
          <form className="flex min-w-0 gap-2" onSubmit={test}><Input className="min-w-0" aria-label="Preview question" maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} placeholder={appearance.placeholder} /><Button type="submit" disabled={!editable || !question.trim() || testing || (mode === "visitor" && !visitorUrl.trim())}>{testing ? "Asking…" : "Ask"}</Button></form>
          {testError && <ErrorNotice>{testError}</ErrorNotice>}
          {preview && <div className="rounded-md border p-2 text-sm">
            <p className="whitespace-pre-wrap break-words">{preview.message}</p>
            {preview.citations.map(citation => <div key={citation.documentId}>{citation.url ? <a className="text-xs underline" href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : <span className="text-xs">{citation.title}</span>}</div>)}
            <SkillPreviewDiagnostics result={preview} />
          </div>}
        </div>
        {launcherVisible ? <div className={`flex ${appearance.position === "bottom-left" ? "justify-start" : "justify-end"}`}>
          <div className="rounded-full px-3 py-2 text-sm text-white" style={{ background: appearance.brandColor }}>{appearance.launcher === "label" ? appearance.launcherLabel : <MessageCircle aria-label="Chat launcher" className="size-5" />}</div>
        </div> : <div className="text-sm text-muted-foreground">The launcher is hidden.</div>}
      </section>}
    </div>
    {section === "conversations" && <section className="space-y-4" aria-label="Geo Agent activity">
      <div><h2 className="text-base font-semibold">Conversation activity</h2><p className="mt-1 text-sm text-muted-foreground">See how visitors are using your assistant.</p></div>
      {!editable ? <p className="text-sm text-muted-foreground">Workspace administrators can view conversation activity.</p>
        : metricsError ? <ErrorNotice>Couldn’t load conversation activity.</ErrorNotice>
        : !metrics ? <p role="status">Loading conversation activity…</p> : <MetricGrid>
        {[
          ["Conversations", metrics.conversations], ["Unique visitors", metrics.visitors], ["Messages", metrics.messages], ["Responses", metrics.responses],
          ["Failed responses", metrics.failed], ["Helpful votes", metrics.helpful], ["Unhelpful votes", metrics.unhelpful],
          ["Responses with retrieved knowledge", metrics.answeredWithKnowledge], ["AI tokens", metrics.tokens],
          ["Average response time", metrics.averageLatencyMs === null ? "—" : `${metrics.averageLatencyMs} ms`],
        ].map(([label, value]) => <Metric key={label} label={String(label)} value={value} />)}
      </MetricGrid>}
    </section>}
    {review && <Dialog open onOpenChange={open => { if (!open && !busy) { setReview(null); setError(""); } }}><DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
      <DialogHeader className="border-b px-5 py-4 pr-12"><DialogTitle className="text-[17px] tracking-[-0.01em]">Publish {experience.name}?</DialogTitle><DialogDescription className="text-[13px] leading-5">{launcherVisible ? "Visitors who match your page and audience rules will see this launcher." : "The launcher is currently hidden by the widget settings."}</DialogDescription></DialogHeader>
      <div className="space-y-4 px-5 py-5">
        <dl className="divide-y rounded-lg border text-sm">
          {[["Sources", config.sourceIds.length], ["Skills", config.skillIds?.length ?? 0], ["Pages", targeting.pageRules.length || "All"], ["Audience", identityNeeded ? "Verified segment" : "All visitors"]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}
        </dl>
        {launcherVisible && dashboard?.hasOtherPublishedAgent && <p className="text-sm text-muted-foreground">Another Geo Agent is published on this site. If both match a visitor, delivery priority and agent ID determine which launcher appears.</p>}
        {error && <ErrorNotice>{error}</ErrorNotice>}
      </div>
      <DialogFooter className="border-t px-5 py-3"><Button variant="ghost" disabled={busy} onClick={() => setReview(null)}>Cancel</Button><Button disabled={busy} onClick={() => void apply(async () => {
        setSaved(await experiences.publishExperience(orgId, siteId, saved.id, review));
        setReview(null);
        setNotice("Geo Agent published.");
      })}>Publish now</Button></DialogFooter>
    </DialogContent></Dialog>}
  </div>;
}

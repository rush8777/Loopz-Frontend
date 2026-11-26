import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@movcues/ui";
import { MessageCircle } from "lucide-react";
import * as experiences from "@/api/experiences";
import { GeoAgentSkills, SkillPreviewDiagnostics } from "./GeoAgentSkills";
import { getGeoAgentMetrics, previewGeoAgent } from "@/api/geoAgent";
import { knowledgeApi, type KnowledgeSource } from "@/api/knowledge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorNotice } from "@/components/PageSurface";
import type { Segment } from "@/types/api";
import type { Experience } from "@/types/experiences";
import type { GeoAgentConfig, GeoAgentDefinition, GeoAgentMetrics, GeoAgentPreviewResult } from "@/types/geoAgent";

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

export function GeoAgentEditor({ experience, initial, orgId, siteId, segments, editable }: {
  experience: Experience; initial: GeoAgentDefinition; orgId: string; siteId: string; segments: Segment[]; editable: boolean;
}) {
  const [saved, setSaved] = useState(experience);
  const [definition, setDefinition] = useState(initial);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [metrics, setMetrics] = useState<GeoAgentMetrics | null>(null);
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
  const avatar = useMemo(() => {
    try { const url = new URL(appearance.avatarUrl ?? ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  }, [appearance.avatarUrl]);
  const style = appearance.theme === "dark" ? "border-slate-700 bg-slate-900 text-white" : "bg-card text-card-foreground";

  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    void knowledgeApi(orgId, siteId).list(controller.signal).then(setSources)
      .catch(error => { if (!controller.signal.aborted) setError(explain(error)); });
    void getGeoAgentMetrics(orgId, siteId, experience.id).then(result => {
      if (!controller.signal.aborted) setMetrics(result);
    }).catch(() => {});
    return () => controller.abort();
  }, [editable, orgId, siteId, experience.id]);

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

  return <>
    <PageHeader section="Experiences" title={experience.name} description="Configure your customer-facing assistant." actions={
      <div className="flex flex-wrap gap-2">
        {saved.status === "published" && editable && <Button variant="outline" disabled={busy} onClick={() => void apply(async () => {
          setSaved(await experiences.pauseExperience(orgId, siteId, saved.id));
          setNotice("Geo Agent paused.");
        })}>Pause</Button>}
        <Button variant="outline" disabled={!editable || !dirty || busy} onClick={() => void apply(async () => { await saveDraft(); setNotice("Draft saved."); })}>Save draft</Button>
        <Button disabled={!editable || busy} onClick={() => void apply(async () => {
          const draft = await saveDraft();
          setReview({ draftVersionId: draft.id, revision: draft.revision });
        })}>Review &amp; publish</Button>
      </div>
    } />
    {error && !review && <ErrorNotice>{error}</ErrorNotice>}{notice && <p role="status" className="my-2 text-sm">{notice}</p>}
    {!editable && <p className="my-2 text-sm text-muted-foreground">Workspace administrators can edit and publish this widget.</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset className="min-w-0" disabled={!editable || busy}>
        <Tabs defaultValue="appearance" className="rounded-xl border bg-card p-4">
          <TabsList><TabsTrigger value="appearance">Appearance</TabsTrigger><TabsTrigger value="knowledge">Knowledge</TabsTrigger><TabsTrigger value="skills">Skills</TabsTrigger><TabsTrigger value="behavior">Behavior</TabsTrigger></TabsList>
          <TabsContent value="appearance" className="mt-4 grid gap-3">
            <Label className="grid gap-1.5">Assistant name<Input maxLength={60} value={appearance.name} onChange={event => changeAppearance({ name: event.target.value })} /></Label>
            <Label className="grid gap-1.5">Avatar URL<Input type="url" value={appearance.avatarUrl ?? ""} placeholder="https://…" onChange={event => changeAppearance({ avatarUrl: event.target.value || undefined })} /></Label>
            <div className="grid grid-cols-2 gap-3">
              <Label className="grid gap-1.5">Brand color<Input type="color" value={appearance.brandColor} onChange={event => changeAppearance({ brandColor: event.target.value })} /></Label>
              <Label className="grid gap-1.5">Theme<select className={selectClass} value={appearance.theme} onChange={event => changeAppearance({ theme: event.target.value as typeof appearance.theme })}><option value="system">Match device</option><option value="light">Light</option><option value="dark">Dark</option></select></Label>
              <Label className="grid gap-1.5">Launcher style<select className={selectClass} value={appearance.launcher} onChange={event => changeAppearance({ launcher: event.target.value as typeof appearance.launcher })}><option value="icon">Icon</option><option value="label">Label</option></select></Label>
              <Label className="grid gap-1.5">Launcher position<select className={selectClass} value={appearance.position} onChange={event => changeAppearance({ position: event.target.value as typeof appearance.position })}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></Label>
            </div>
            {appearance.launcher === "label" && <Label className="grid gap-1.5">Launcher label<Input value={appearance.launcherLabel} maxLength={35} onChange={event => changeAppearance({ launcherLabel: event.target.value })} /></Label>}
            <Label className="grid gap-1.5">Welcome message<Textarea value={appearance.welcome} maxLength={500} onChange={event => changeAppearance({ welcome: event.target.value })} /></Label>
            <Label className="grid gap-1.5">Input placeholder<Input value={appearance.placeholder} maxLength={80} onChange={event => changeAppearance({ placeholder: event.target.value })} /></Label>
            <Label className="grid gap-1.5">Suggested questions, one per line<Textarea key={saved.draftVersion?.revision} defaultValue={appearance.suggestions.join("\n")} maxLength={605} onChange={event => changeAppearance({ suggestions: event.target.value.split("\n").map(value => value.trim().slice(0, 120)).filter(Boolean).slice(0, 5) })} /></Label>
          </TabsContent>
          <TabsContent value="knowledge" className="mt-4 grid gap-3">
            <h2 className="text-sm font-semibold">Knowledge sources</h2>
            <p className="text-sm text-muted-foreground">Choose sources that have visitor access. <Link className="underline" to="/knowledge">Manage sources</Link></p>
            {sources.filter(source => source.visibility === "public" || config.sourceIds.includes(source.id)).map(source => {
              const checked = config.sourceIds.includes(source.id);
              const available = source.enabled && source.visibility === "public";
              return <label key={source.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={checked} disabled={!checked && !available} onCheckedChange={value => changeConfig({ sourceIds: value === true ? [...config.sourceIds, source.id] : config.sourceIds.filter(id => id !== source.id) })} />
                {source.name} <span className="text-xs text-muted-foreground">{available ? source.status : "Unavailable"}</span>
              </label>;
            })}
            {config.sourceIds.filter(id => !sources.some(source => source.id === id)).map(id => <Button key={id} variant="outline" size="sm" onClick={() => changeConfig({ sourceIds: config.sourceIds.filter(sourceId => sourceId !== id) })}>Remove unavailable source</Button>)}
            <Label className="grid gap-1.5">Tone and presentation instructions<Textarea value={config.instructions} maxLength={1500} onChange={event => changeConfig({ instructions: event.target.value })} /></Label>
            <Label className="grid gap-1.5">Fallback reply<Textarea value={config.fallback} maxLength={350} onChange={event => changeConfig({ fallback: event.target.value })} /></Label>
          </TabsContent>
          <TabsContent value="skills" className="mt-4">
            <GeoAgentSkills orgId={orgId} siteId={siteId} selected={config.skillIds ?? []} onChange={skillIds => changeConfig({ skillIds })} editable={editable} />
          </TabsContent>
          <TabsContent value="behavior" className="mt-4 grid gap-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.enabled} onCheckedChange={value => changeConfig({ enabled: value === true })} />Enable Geo Agent</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={config.showLauncher} onCheckedChange={value => changeConfig({ showLauncher: value === true })} />Show launcher</label>
            <Label className="grid gap-1.5">Remember conversation<select className={selectClass} value={config.persistence} onChange={event => changeConfig({ persistence: event.target.value as GeoAgentConfig["persistence"] })}><option value="tab">Across pages in this tab</option><option value="page">On this page only</option></select></Label>
            <Label className="grid gap-1.5">Page paths, one per line<Textarea key={saved.draftVersion?.revision} defaultValue={targeting.pageRules.map(rule => rule.value).join("\n")} placeholder="All pages when empty" onChange={event => changeTargeting({ pageRules: event.target.value.split("\n").map(path => path.trim()).filter(Boolean).slice(0, 30).map((value, index) => ({ id: `geo-page-${index + 1}`, kind: "include", operator: "starts_with", value })) })} /></Label>
            <Label className="grid gap-1.5">Audience<select className={selectClass} value={targeting.audience.type === "segment" ? targeting.audience.segmentId : targeting.audience.type === "segment_rules" ? "__rules" : ""}
              onChange={event => changeTargeting({ audience: event.target.value ? { type: "segment", segmentId: event.target.value } : { type: "all" } })}>
              <option value="">All visitors</option>
              {targeting.audience.type === "segment_rules" && <option value="__rules" disabled>Existing segment rules</option>}
              {segments.map(segment => <option value={segment.id} key={segment.id}>{segment.name}</option>)}
            </select></Label>
            <Label className="grid gap-1.5">Visitor identity public key{identityNeeded ? " (required for this audience)" : " (optional)"}
              <Textarea value={config.identityPublicKey ?? ""} maxLength={512} placeholder="-----BEGIN PUBLIC KEY-----" onChange={event => changeConfig({ identityPublicKey: event.target.value || undefined })} /></Label>
          </TabsContent>
        </Tabs>
      </fieldset>
      <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="Widget preview">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Live preview</h2><span className="text-xs text-muted-foreground">Only you can see this</span></div>
        <div className={`space-y-3 rounded-lg border p-3 ${style}`} style={{ borderTopColor: appearance.brandColor, borderTopWidth: 3 }}>
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
          <form className="flex gap-2" onSubmit={test}><Input aria-label="Preview question" maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} placeholder={appearance.placeholder} /><Button type="submit" disabled={!editable || !question.trim() || testing || (mode === "visitor" && !visitorUrl.trim())}>{testing ? "Asking…" : "Ask"}</Button></form>
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
      </section>
    </div>
    {metrics && <section className="mt-5 space-y-3 rounded-xl border bg-card p-4" aria-label="Geo Agent activity">
      <h2 className="font-semibold">Conversation activity</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Conversations", metrics.conversations], ["Unique visitors", metrics.visitors], ["Messages", metrics.messages], ["Responses", metrics.responses],
          ["Failed responses", metrics.failed], ["Helpful votes", metrics.helpful], ["Unhelpful votes", metrics.unhelpful],
          ["Responses with retrieved knowledge", metrics.answeredWithKnowledge], ["AI tokens", metrics.tokens],
          ["Average response time", metrics.averageLatencyMs === null ? "—" : `${metrics.averageLatencyMs} ms`],
        ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
      </dl>
    </section>}
    {review && <Dialog open onOpenChange={open => { if (!open && !busy) { setReview(null); setError(""); } }}><DialogContent>
      <DialogHeader><DialogTitle>Publish {experience.name}?</DialogTitle><DialogDescription>{launcherVisible ? "Visitors who match your page and audience rules will see this launcher." : "The launcher is currently hidden by the widget settings."}</DialogDescription></DialogHeader>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt>Sources</dt><dd>{config.sourceIds.length}</dd><dt>Skills</dt><dd>{config.skillIds?.length ?? 0}</dd><dt>Pages</dt><dd>{targeting.pageRules.length || "All"}</dd><dt>Audience</dt><dd>{identityNeeded ? "Verified segment" : "All visitors"}</dd>
      </dl>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReview(null)}>Cancel</Button><Button disabled={busy} onClick={() => void apply(async () => {
        setSaved(await experiences.publishExperience(orgId, siteId, saved.id, review));
        setReview(null);
        setNotice("Geo Agent published.");
      })}>Publish now</Button></DialogFooter>
    </DialogContent></Dialog>}
  </>;
}

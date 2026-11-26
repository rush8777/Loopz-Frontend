import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Checkbox, Input, Label } from "@movcues/ui";
import { agentSkills, skillStatus, type AgentSkill } from "@/api/agentSkills";
import type { GeoAgentPreviewResult } from "@/types/geoAgent";

export function GeoAgentSkills({ orgId, siteId, selected, onChange, editable }: {
  orgId: string; siteId: string; selected: string[]; onChange(ids: string[]): void; editable: boolean;
}) {
  const [skills, setSkills] = useState<AgentSkill[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!editable) return;
    const controller = new AbortController();
    void agentSkills(orgId, siteId).list(controller.signal).then(result => {
      if (!controller.signal.aborted) setSkills(result.skills);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [orgId, siteId, editable, refresh]);
  if (!editable) return <p className="text-sm text-muted-foreground">Administrators manage the guide skills available to this widget.</p>;
  const query = search.trim().toLowerCase();
  const visible = skills?.filter(({ metadata }) => [metadata.name, metadata.description, ...metadata.keywords].some(text => text.toLowerCase().includes(query)));
  return <section className="grid gap-3">
    <p className="text-sm text-muted-foreground">Select the guides this widget can recommend when a visitor is eligible.</p>
    <div className="flex items-end gap-2">
      <Label className="grid grow gap-1.5">Search skills<Input value={search} onChange={event => setSearch(event.target.value)} /></Label>
      <Button type="button" variant="outline" size="sm" onClick={() => { setSkills(null); setError(false); setRefresh(n => n + 1); }}>Refresh</Button>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">Couldn’t load skills.</p> : !skills ? <p role="status" className="text-sm">Loading skills…</p> : !visible?.length && <p className="text-sm text-muted-foreground">{query ? "No skills match this search." : "Enable Geo Agent availability on a published guide to add a skill."}</p>}
    {visible?.map(skill => {
      const checked = selected.includes(skill.id);
      return <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2" key={skill.id}>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={checked} disabled={!checked && (!skill.enabled || selected.length >= 500)} onCheckedChange={value => onChange(value === true ? [...selected, skill.id] : selected.filter(id => id !== skill.id))} />
          <span>{skill.metadata.name} <span className="ml-1 text-xs text-muted-foreground">{skillStatus[skill.status]}</span></span>
        </label>
        <Link aria-label={`Edit guide for ${skill.metadata.name}`} className="text-xs underline" to={`/experiences/${encodeURIComponent(skill.guideId)}/edit`}>Edit guide</Link>
      </div>;
    })}
    {skills && selected.filter(id => !skills.some(skill => skill.id === id)).map(id =>
      <Button key={id} className="w-fit" type="button" variant="outline" size="sm" onClick={() => onChange(selected.filter(value => value !== id))}>Remove unavailable skill</Button>)}
  </section>;
}

const explanations: Record<string, string> = {
  guide_unavailable: "Guide is unavailable", disabled: "Skill is disabled", pending: "Indexing pending", failed: "Indexing failed",
  audience: "Verified audience requirement", precondition: "Workflow requirement cannot be verified", origin: "Site origin restricted",
  schedule: "Outside the active schedule", low_relevance: "Low relevance", widget_ineligible: "Geo Agent is unavailable to the simulated visitor",
  verified_identity_required: "Verified visitor identity required", audience_restricted: "Outside the guide audience",
  origin_restricted: "Restricted site origin", outside_schedule: "Outside the guide schedule",
  unverified_preconditions: "Workflow requirements cannot be verified", widget_targeting: "Outside the widget targeting rules",
  index_pending: "Indexing pending", index_failed: "Indexing failed",
  invalid_guide: "Guide configuration unavailable", skill_unavailable: "Skill is unavailable",
};
const decisions = { answer_only: "Answer only", clarify: "Clarification needed", insufficient_evidence: "Insufficient evidence" };

export function SkillPreviewDiagnostics({ result }: { result: GeoAgentPreviewResult }) {
  const [open, setOpen] = useState(false);
  const { decision } = result;
  const recommendation = decision?.decision === "recommend_skill" ? decision : null;
  const recommendedName = result.candidates?.find(candidate => candidate.id === recommendation?.skillId)?.name;
  return <details className="mt-3 border-t pt-2" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">Retrieval diagnostics</summary>
    {open && <div className="mt-2 grid gap-2 text-xs">
      {result.permitted === false && <p role="status">The simulated visitor is ineligible for this Geo Agent.</p>}
      <p>{recommendation ? `Recommend ${recommendedName ?? "the selected skill"}` : decision ? decisions[decision.decision as keyof typeof decisions] : "Answer only"}</p>
      {recommendation && <p>{recommendation.reason}</p>}
      <p>Retrieval {result.retrievalMs ?? 0} ms</p>
      <h3 className="font-medium">Skill candidates</h3>
      {result.candidates?.length ? <ol className="grid gap-1">
        {result.candidates.map(candidate => <li key={candidate.id}><strong>{candidate.name}</strong> · {candidate.score.toFixed(3)} · {candidate.eligible ? "Eligible" : "Excluded"}{candidate.reason ? ` · ${explanations[candidate.reason] ?? candidate.reason.replaceAll("_", " ")}` : ""}</li>)}
      </ol> : <p>No skill candidates.</p>}
      <h3 className="font-medium">Retrieved documentation</h3>
      {result.documentation?.length ? <ul className="grid gap-2">{result.documentation.map((reference, index) => <li className="break-words" key={index}><strong>{reference.title}</strong><p>{reference.excerpt}</p></li>)}</ul> : <p>No matching documentation.</p>}
    </div>}
  </details>;
}

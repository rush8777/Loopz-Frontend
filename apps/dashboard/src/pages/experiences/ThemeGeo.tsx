import { useEffect, useRef, useState } from "react";
import { Button, Label } from "@movcues/ui";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import { proposeThemeEdit } from "../../api/themes";
import { themeComponentNames } from "../../components/settings/ThemesSettings";
import type { SiteThemeTokens, ThemeEditScope, ThemeProposal } from "../../types/themes";
import { GeoAvatar } from "../ai/GeoAvatar";
import { controlNames, labelFor } from "./ThemeControls";

function changedAreas(before: SiteThemeTokens, after: SiteThemeTokens) {
  const foundation = (["colors", "typography", "radii", "shadows", "spacing", "motion", "focusColor"] as const)
    .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(labelFor);
  const shared = Object.entries(controlNames).filter(([key]) => JSON.stringify(before.shared?.[key as keyof typeof controlNames]) !==
    JSON.stringify(after.shared?.[key as keyof typeof controlNames])).map(([, label]) => label);
  const experiences = Object.entries(themeComponentNames).filter(([key]) => JSON.stringify(before.components?.[key as keyof typeof themeComponentNames]) !==
    JSON.stringify(after.components?.[key as keyof typeof themeComponentNames])).map(([, label]) => label);
  return [...foundation, ...shared, ...experiences];
}

export function ThemeGeo({ orgId, siteId, tokens, revision, disabled, expanded, toggle, onApply, onCompare }: {
  orgId: string; siteId: string; tokens: SiteThemeTokens; revision: number; disabled: boolean; expanded: boolean; toggle: () => void;
  onApply: (proposal: ThemeProposal) => void; onCompare: (proposal: ThemeProposal | null) => void;
}) {
  const [scope, setScope] = useState<ThemeEditScope>("auto");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<Array<{ request: string; reply?: string }>>([]);
  const [proposal, setProposal] = useState<ThemeProposal | null>(null);
  const [compare, setCompare] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const stale = !!proposal && proposal.revision !== revision;
  const changed = proposal ? changedAreas(tokens, proposal.tokens) : [];
  useEffect(() => {
    if (stale && compare) onCompare(null);
  }, [stale, compare, onCompare]);

  function request() {
    const submitted = prompt.trim();
    if (!submitted || disabled || controller.current) return;
    const pending = new AbortController();
    controller.current = pending;
    setWorking(true);
    setError("");
    if (compare) onCompare(null);
    setCompare(false);
    setProposal(null);
    setHistory(items => [...items.slice(-8), { request: submitted }]);
    setPrompt("");
    const context = history.flatMap(entry => entry.reply ? [{ request: entry.request, reply: entry.reply }] : []).slice(-4);
    void proposeThemeEdit(orgId, siteId, { request: submitted, scope, tokens, revision, history: context }, pending.signal).then(result => {
      if (pending.signal.aborted) return;
      setProposal(result);
      setHistory(items => items.map((item, index) => index === items.length - 1 ? { ...item, reply: result.explanation } : item));
    }).catch(() => {
      if (!pending.signal.aborted) { setError("Geo couldn’t propose a change. Try again."); setPrompt(submitted); }
    }).finally(() => {
      if (controller.current === pending) { controller.current = null; setWorking(false); }
    });
  }

  function dismiss() {
    onCompare(null);
    setProposal(null);
    setCompare(false);
  }

  return <section className="min-w-0 rounded-xl border bg-card" aria-label="Geo theme assistant">
    <button type="button" aria-expanded={expanded} onClick={toggle}
      className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-muted/40">
      <GeoAvatar state={working ? "thinking" : proposal ? "replying" : "idle"}/><span className="flex-1">Design with Geo</span>
      {proposal && !expanded && <span className="text-xs font-normal text-muted-foreground">Proposal ready</span>}
      <ChevronDown aria-hidden className={`size-4 ${expanded ? "rotate-180" : ""}`}/>
    </button>
    {expanded && <div className="space-y-3 border-t p-4">
      {history.length > 0 && <ol className="max-h-44 space-y-3 overflow-y-auto text-sm">
        {history.map((entry, index) => <li key={index} className="space-y-1.5">
          <p className="ml-auto max-w-[95%] rounded-xl bg-muted px-3 py-2">{entry.request}</p>
          {entry.reply && <p className="px-1 text-muted-foreground">{entry.reply}</p>}
        </li>)}
      </ol>}
      {working && <p role="status" className="text-sm text-muted-foreground">Geo is preparing a proposal…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {proposal && <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="font-medium">{stale ? "This draft changed while Geo was working." : changed.length ? "Proposed changes" : "The proposal matches this draft."}</p>
        {!stale && changed.length > 0 && <p className="text-muted-foreground">{changed.join(", ")}</p>}
        <div className="flex flex-wrap gap-1">
          {!stale && changed.length > 0 && <>
            <Button size="sm" variant="outline" aria-pressed={compare} onClick={() => {
              onCompare(compare ? null : proposal); setCompare(!compare);
            }}>{compare ? "Hide comparison" : "Compare previews"}</Button>
            <Button size="sm" disabled={disabled} onClick={() => { onApply(proposal); dismiss(); }}>Apply</Button>
          </>}
          <Button size="sm" variant="ghost" onClick={dismiss}>Discard</Button>
        </div>
      </div>}
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); request(); }}>
        <div className="grid gap-1.5">
          <Label htmlFor="theme-geo-scope">Scope</Label>
          <select id="theme-geo-scope" value={scope} className="rounded-md border bg-background px-2.5 py-2 text-sm" disabled={working} onChange={event => setScope(event.target.value as ThemeEditScope)}>
            <option value="auto">Choose from request</option><option value="theme">Entire theme</option><option value="foundation">Foundation</option>
            <optgroup label="Experience">{Object.entries(themeComponentNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</optgroup>
            <optgroup label="Shared control">{Object.entries(controlNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</optgroup>
          </select>
        </div>
        <Label className="grid gap-1.5" htmlFor="theme-geo-prompt">What would you like to change?</Label>
        <textarea id="theme-geo-prompt" className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm" value={prompt}
          maxLength={1200} onChange={event => setPrompt(event.target.value)} placeholder="Make guide tooltips more compact"/>
        {working
          ? <Button size="sm" variant="outline" type="button" onClick={() => { controller.current?.abort(); controller.current = null; setWorking(false); }}><X/>Cancel generation</Button>
          : <Button size="sm" type="submit" disabled={disabled || !prompt.trim()}>Ask Geo<ArrowRight/></Button>}
      </form>
    </div>}
  </section>;
}

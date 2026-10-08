import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Sparkles } from "lucide-react";
import { Button, Input, Label } from "@movcues/ui";
import * as authApi from "../../api/auth";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";

type Setup = NonNullable<Awaited<ReturnType<typeof authApi.getOnboarding>>["organization"]> & { site: NonNullable<Awaited<ReturnType<typeof authApi.getOnboarding>>["site"]> };
const steps = ["Workspace", "Your site", "Install", "Connected"];

export function OnboardingPage() {
  const { refreshOrgs } = useWorkspace();
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => { void authApi.getOnboarding().then((state) => {
    if (state.organization && state.site) { setSetup({ ...state.organization, site: state.site }); setStep(2); }
  }).catch(() => setError("We couldn't load your setup progress.")).finally(() => setBusy(false)); }, []);

  useEffect(() => {
    if (!setup || !verificationId) return;
    const timer = window.setInterval(() => void sitesApi.getSdkVerification(setup.id, setup.site.id, verificationId).then(({ verification }) => {
      if (verification.status === "connected") { window.clearInterval(timer); setStep(3); void refreshOrgs?.(); }
    }).catch(() => undefined), 2000);
    return () => window.clearInterval(timer);
  }, [refreshOrgs, setup, verificationId]);

  const snippet = useMemo(() => setup ? `<script async src="https://cdn.movcues.com/v1.js" data-site-id="${setup.site.siteId}"></script>` : "", [setup]);
  const agentPrompt = useMemo(() => `Install the Movcues SDK in this web project. Add this script once, inside the document <head> so it loads on every production page:\n\n${snippet}\n\nDo not alter its attributes. Tell me which file you changed.`, [snippet]);
  async function copy(value: string) { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  async function createWorkspace(event: FormEvent) { event.preventDefault(); if (!workspaceName.trim()) return; setStep(1); }
  async function createSite(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try {
    const result = await authApi.completeOnboarding({ workspaceName: workspaceName.trim(), siteName: siteName.trim(), domain: domain.trim() });
    setSetup({ ...result.organization!, site: result.site! }); setStep(2); await refreshOrgs?.();
  } catch { setError("Check the site name and enter a valid website origin, such as https://example.com."); } finally { setBusy(false); } }
  async function verify() { if (!setup) return; setBusy(true); setError(null); try { const { verification } = await sitesApi.createSdkVerification(setup.id, setup.site.id); setVerificationId(verification.id); } catch { setError("We couldn't start the connection check. Please try again."); } finally { setBusy(false); } }
  if (busy && !setup && step === 0) return <div className="min-h-dvh bg-background" />;
  const art = ["workspace", "site", "install", "connected"][step];
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_90%_10%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_34%),var(--background)] px-5 py-6 sm:p-10"><div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col"><header className="flex items-center justify-between"><div className="flex items-center gap-2 font-semibold tracking-[-.02em]"><span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">m</span>movcues</div><span className="text-xs font-medium text-muted-foreground">SETUP · {step + 1} / 4</span></header><section className="my-auto grid overflow-hidden rounded-[2rem] border bg-card shadow-[0_28px_100px_-52px_rgba(25,28,22,.45)] lg:grid-cols-[.84fr_1.16fr]"><aside className="relative hidden min-h-[590px] overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col"><div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_80%,#c8ff73_0,transparent_30%),radial-gradient(circle_at_90%_10%,white_0,transparent_28%)]" /><div className="relative mt-auto"><img src={`/onboarding/${art}.png`} alt="" className="mx-auto mb-6 size-64 object-contain drop-shadow-2xl" /><p className="text-xs font-semibold tracking-[.18em] text-primary-foreground/75 uppercase">Make the first connection</p><h1 className="mt-3 text-4xl leading-[1.04] font-semibold tracking-[-.055em]">A thoughtful start, built for what comes next.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-primary-foreground/75">We’ll connect your first product, then unlock the space to understand every customer moment.</p></div></aside><div className="p-7 sm:p-12 lg:p-16"><div className="mb-10 flex gap-2">{steps.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><span className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index < step ? <Check className="size-3" /> : index + 1}</span>{index < 3 && <i className={`h-px flex-1 ${index < step ? "bg-primary" : "bg-border"}`} />}</div>)}</div>{error && <p className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
{step === 0 && <form onSubmit={createWorkspace} className="max-w-md"><p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">Start here</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em]">Name your workspace.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">This is the shared home for your team, sites, and product insights.</p><div className="mt-9 grid gap-2"><Label htmlFor="workspace">Workspace name</Label><Input id="workspace" autoFocus required value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme" className="h-12 rounded-xl" /></div><Button type="submit" className="mt-7 h-12 rounded-xl px-6">Continue</Button></form>}
{step === 1 && <form onSubmit={createSite} className="max-w-md"><p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">Your first site</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em]">Where should Movcues listen?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Use the site’s root origin. You can add more sites later.</p><div className="mt-8 grid gap-5"><Label>Site name<Input required value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Acme app" className="mt-2 h-12 rounded-xl" /></Label><Label>Website domain<Input required type="url" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="https://app.acme.com" className="mt-2 h-12 rounded-xl" /></Label></div><div className="mt-7 flex gap-3"><Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setStep(0)}>Back</Button><Button type="submit" className="h-12 rounded-xl px-6" disabled={busy}>{busy ? "Creating…" : "Create site"}</Button></div></form>}
{step === 2 && setup && <div className="max-w-xl"><p className="text-xs font-semibold tracking-[.16em] text-primary uppercase">Install the SDK</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em]">Connect {setup.site.name}.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Paste this once inside your site’s <code>&lt;head&gt;</code>. It begins collecting after you publish.</p><CodeBlock title="SDK snippet" value={snippet} copied={copied} onCopy={() => void copy(snippet)} /><p className="mt-6 text-sm font-medium">Using an AI coding assistant?</p><p className="mt-1 text-sm text-muted-foreground">Give it this prompt and it will find the right file for you.</p><CodeBlock title="Agent prompt" value={agentPrompt} copied={copied} onCopy={() => void copy(agentPrompt)} compact /><Button className="mt-7 h-12 rounded-xl px-6" onClick={() => void verify()} disabled={busy}>{verificationId ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Waiting for connection…</> : "I’ve installed it — verify connection"}</Button><p className="mt-3 text-xs text-muted-foreground">Keep this page open while we look for the SDK.</p></div>}
{step === 3 && <div className="max-w-md"><span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Sparkles className="size-5" /></span><p className="mt-7 text-xs font-semibold tracking-[.16em] text-primary uppercase">You’re connected</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.05em]">Your dashboard is ready.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Movcues is receiving signals from your site. Start exploring, then turn insight into thoughtful experiences.</p><Button className="mt-8 h-12 rounded-xl px-6" onClick={() => window.location.assign("/")}>Open dashboard <ExternalLink className="ml-2 size-4" /></Button></div>}</div></section></div></main>;
}

function CodeBlock({ title, value, onCopy, copied, compact = false }: { title: string; value: string; onCopy: () => void; copied: boolean; compact?: boolean }) { return <div className={`mt-5 overflow-hidden rounded-2xl border bg-muted/40 ${compact ? "" : ""}`}><div className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-medium text-muted-foreground"><span>{title}</span><button type="button" onClick={onCopy} className="inline-flex items-center gap-1.5 text-foreground hover:text-primary">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</button></div><pre className="overflow-x-auto p-4 text-xs leading-5 whitespace-pre-wrap text-foreground"><code>{value}</code></pre></div>; }

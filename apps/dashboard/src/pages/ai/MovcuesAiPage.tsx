import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowUp, BarChart3, Check, Clock3, History, Lightbulb, LoaderCircle, MoreHorizontal, Plus, Sparkles, Square, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Textarea, cn } from "@movcues/ui";
import { useAuth } from "@/auth/AuthContext";
import { useWorkspace } from "@/auth/WorkspaceContext";
import * as aiApi from "@/api/ai";
import type { AiConversation, AiMessage, AiProposal, SegmentGroup } from "@/api/ai";

const suggestions = [
  { label: "Performance digest", icon: BarChart3, prompt: "Give me a performance digest for the last 30 days. Compare it with the previous period and cite the real metrics and sample sizes." },
  { label: "Find opportunities", icon: Lightbulb, prompt: "Find the strongest product opportunities from our recent drop-offs, engagement, and experience performance. Separate evidence from hypotheses." },
  { label: "Recent changes", icon: Clock3, prompt: "What meaningfully changed in our product metrics compared with the previous period?" },
] as const;
const moreSuggestions = [
  "Create an onboarding performance dashboard using supported metrics.",
  "Create a segment of users active in the last 7 days who did not complete onboarding.",
  "Create a funnel using our real signup, onboarding, and activation events.",
] as const;

export function MovcuesAiPage() {
  const { user } = useAuth();
  const { currentOrg, currentSite, loading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    if (!currentOrg || !currentSite) return;
    const result = await aiApi.listAiConversations(currentOrg.orgId, currentSite.id);
    setConversations(result.conversations);
  }, [currentOrg, currentSite]);

  useEffect(() => {
    setConversationId(null); setMessages([]); setError(null);
    if (!currentOrg || !currentSite) return;
    void Promise.all([refreshConversations(), aiApi.getAiStatus(currentOrg.orgId, currentSite.id).then(status => setEnabled(status.enabled))]).catch(reason => setError(reason instanceof Error ? reason.message : "Could not load Movcues AI."));
  }, [currentOrg, currentSite, refreshConversations]);

  useEffect(() => { if (typeof bottomRef.current?.scrollIntoView === "function") bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  async function openConversation(id: string) {
    if (!currentOrg || !currentSite) return;
    setError(null); setLoading(true);
    try { const result = await aiApi.getAiConversation(currentOrg.orgId, currentSite.id, id); setConversationId(id); setMessages(result.messages); setHistoryOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open this conversation."); }
    finally { setLoading(false); }
  }

  function newConversation() {
    abortRef.current?.abort(); setConversationId(null); setMessages([]); setDraft(""); setError(null); setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function submit(content = draft) {
    const prompt = content.trim();
    if (!prompt || loading || !currentOrg || !currentSite || enabled === false) return;
    setError(null); setDraft(""); setLoading(true);
    const optimistic: AiMessage = { id: "optimistic-" + Date.now(), role: "user", content: prompt, evidence: [], proposal: null, approval: null, createdAt: new Date().toISOString() };
    setMessages(previous => [...previous, optimistic]);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let activeId = conversationId;
      if (!activeId) { const created = await aiApi.createAiConversation(currentOrg.orgId, currentSite.id); activeId = created.id; setConversationId(created.id); }
      const result = await aiApi.sendAiMessage(currentOrg.orgId, currentSite.id, activeId, prompt, controller.signal);
      setMessages(previous => [...previous.filter(message => message.id !== optimistic.id), result.userMessage, result.assistantMessage]);
      await refreshConversations();
    } catch (reason) {
      if ((reason as Error)?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Movcues AI could not complete that request.");
      setMessages(previous => previous.filter(message => message.id !== optimistic.id)); setDraft(prompt);
    } finally { setLoading(false); abortRef.current = null; }
  }

  async function decide(message: AiMessage, action: "approve" | "reject") {
    if (!currentOrg || !currentSite || !message.approval) return;
    setApproving(message.approval.id); setError(null);
    try {
      if (action === "reject") await aiApi.rejectAiProposal(currentOrg.orgId, currentSite.id, message.approval.id);
      else {
        const result = await aiApi.approveAiProposal(currentOrg.orgId, currentSite.id, message.approval.id);
        navigate(result.resource.path); return;
      }
      setMessages(previous => previous.map(item => item.id === message.id && item.approval ? { ...item, approval: { ...item.approval, status: "rejected" } } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not complete the approval."); }
    finally { setApproving(null); }
  }

  async function removeConversation(id: string) {
    if (!currentOrg || !currentSite) return;
    await aiApi.deleteAiConversation(currentOrg.orgId, currentSite.id, id);
    if (id === conversationId) newConversation();
    await refreshConversations();
  }

  const firstName = useMemo(() => user?.name?.trim().split(/\s+/)[0] || user?.email.split("@")[0] || "there", [user]);
  if (workspaceLoading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  if (!currentOrg || !currentSite) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Select a site to use Movcues AI.</div>;

  return <div className="-my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col lg:-my-8">
    <div className="flex items-center justify-between border-b py-3">
      <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg border bg-card shadow-sm"><Sparkles className="size-4 text-primary" /></span><div><h1 className="text-sm font-semibold">Movcues AI</h1><p className="text-xs text-muted-foreground">Answers grounded in this site's data</p></div></div>
      <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setHistoryOpen(value => !value)}><History />History</Button><Button variant="outline" size="sm" onClick={newConversation}><Plus />New chat</Button></div>
    </div>
    <div className="relative flex min-h-0 flex-1">
      {historyOpen && <aside className="absolute right-0 top-3 z-20 w-[min(340px,calc(100vw-2rem))] rounded-xl border bg-card p-2 shadow-lg" aria-label="Conversation history"><div className="flex items-center justify-between px-2 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent conversations</span><Button variant="ghost" size="icon" className="size-7" onClick={() => setHistoryOpen(false)} aria-label="Close history"><X /></Button></div><div className="mt-1 max-h-[60vh] space-y-1 overflow-y-auto">{conversations.length ? conversations.map(item => <div key={item.id} className={cn("group flex items-center rounded-lg", item.id === conversationId && "bg-muted")}><button className="min-w-0 flex-1 px-2 py-2 text-left" onClick={() => void openConversation(item.id)}><span className="block truncate text-sm font-medium">{item.title}</span><span className="block text-[11px] text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</span></button><Button variant="ghost" size="icon" className="mr-1 size-7 opacity-0 group-hover:opacity-100" onClick={() => void removeConversation(item.id)} aria-label={"Delete " + item.title}><Trash2 /></Button></div>) : <p className="px-2 py-8 text-center text-sm text-muted-foreground">No conversations yet.</p>}</div></aside>}
      {messages.length === 0 ? <Welcome firstName={firstName} draft={draft} setDraft={setDraft} submit={submit} loading={loading} enabled={enabled} moreOpen={moreOpen} setMoreOpen={setMoreOpen} textareaRef={textareaRef} error={error} /> : <Conversation messages={messages} draft={draft} setDraft={setDraft} submit={submit} loading={loading} enabled={enabled} error={error} textareaRef={textareaRef} bottomRef={bottomRef} stop={() => abortRef.current?.abort()} decide={decide} approving={approving} />}
    </div>
  </div>;
}

function Welcome(props: { firstName: string; draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; enabled: boolean | null; moreOpen: boolean; setMoreOpen: (v: boolean) => void; textareaRef: RefObject<HTMLTextAreaElement | null>; error: string | null }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-1 py-14 text-center sm:px-6"><div className="mb-5 grid size-11 place-items-center rounded-xl border bg-card shadow-sm"><Sparkles className="size-5 text-primary" /></div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {props.firstName}</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Explore product performance, understand users, and turn findings into Movcues resources.</p><div className="mt-8 w-full"><Composer {...props} /><div className="mt-4 flex flex-wrap justify-center gap-2">{suggestions.map(item => <Suggestion key={item.label} label={item.label} icon={item.icon} onClick={() => void props.submit(item.prompt)} disabled={props.loading || props.enabled === false} />)}<Suggestion label="More" icon={MoreHorizontal} onClick={() => props.setMoreOpen(!props.moreOpen)} disabled={props.loading || props.enabled === false} /></div>{props.moreOpen && <div className="mx-auto mt-2 flex max-w-2xl flex-wrap justify-center gap-2">{moreSuggestions.map(prompt => <button key={prompt} type="button" className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground" onClick={() => void props.submit(prompt)}>{prompt}</button>)}</div>}</div>{props.enabled === false && <p className="mt-5 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-800">Movcues AI is disabled until a backend provider is configured.</p>}{props.error && <p role="alert" className="mt-5 text-sm text-destructive">{props.error}</p>}</div>;
}

function Conversation(props: { messages: AiMessage[]; draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; enabled: boolean | null; error: string | null; textareaRef: RefObject<HTMLTextAreaElement | null>; bottomRef: RefObject<HTMLDivElement | null>; stop: () => void; decide: (message: AiMessage, action: "approve" | "reject") => Promise<void>; approving: string | null }) {
  return <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col"><div className="flex-1 space-y-6 overflow-y-auto py-8 pr-1">{props.messages.map(message => <Message key={message.id} message={message} decide={props.decide} approving={props.approving} />)}{props.loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid size-7 place-items-center rounded-lg border bg-card"><LoaderCircle className="size-3.5 animate-spin" /></span>Analyzing your Movcues data…</div>}{props.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{props.error}</div>}<div ref={props.bottomRef} /></div><div className="sticky bottom-0 bg-background pb-4 pt-3"><Composer {...props} /></div></div>;
}

function Message({ message, decide, approving }: { message: AiMessage; decide: (message: AiMessage, action: "approve" | "reject") => Promise<void>; approving: string | null }) {
  if (message.role === "user") return <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-muted px-4 py-3 text-sm leading-6">{message.content}</div>;
  return <article className="flex gap-3"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border bg-card shadow-sm"><Sparkles className="size-4 text-primary" /></span><div className="min-w-0 flex-1"><div className="ai-markdown text-sm leading-6"><MarkdownLite source={message.content} /></div>{message.proposal && <ProposalCard proposal={message.proposal} approval={message.approval} busy={approving === message.approval?.id} approve={() => void decide(message, "approve")} reject={() => void decide(message, "reject")} />}{message.evidence.length > 0 && <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Sources and limitations ({message.evidence.length})</summary><ul className="mt-2 space-y-1.5">{message.evidence.map((item, index) => <li key={item.source + "-" + index} className="rounded-md border bg-muted/30 px-3 py-2"><span className="font-medium text-foreground">{item.label}</span> · {item.source}{item.range && <> · {new Date(item.range.since).toLocaleDateString()}–{new Date(item.range.until).toLocaleDateString()}</>}{item.sampleSize !== undefined && <> · n={item.sampleSize}</>}{item.limitation && <span className="mt-1 block">{item.limitation}</span>}</li>)}</ul></details>}</div></article>;
}

function MarkdownLite({ source }: { source: string }) {
  const rows = source.split(/\r?\n/); const nodes: ReactNode[] = []; let bullets: string[] = [];
  const flush = () => { if (bullets.length) { nodes.push(<ul key={"list-" + nodes.length}>{bullets.map((text, index) => <li key={index}>{inline(text)}</li>)}</ul>); bullets = []; } };
  rows.forEach((raw, index) => { const line = raw.trim(); if (/^[-*] /.test(line)) { bullets.push(line.slice(2)); return; } flush(); if (!line) return; if (line.startsWith("### ")) nodes.push(<h3 key={index}>{inline(line.slice(4))}</h3>); else if (line.startsWith("## ")) nodes.push(<h2 key={index}>{inline(line.slice(3))}</h2>); else if (line.startsWith("# ")) nodes.push(<h1 key={index}>{inline(line.slice(2))}</h1>); else nodes.push(<p key={index}>{inline(line)}</p>); }); flush(); return <>{nodes}</>;
}
function inline(text: string) { return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>); }

function Composer({ draft, setDraft, submit, loading, enabled, textareaRef, stop }: { draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; enabled: boolean | null; textareaRef: RefObject<HTMLTextAreaElement | null>; stop?: () => void }) {
  useEffect(() => { const element = textareaRef.current; if (!element) return; element.style.height = "0px"; element.style.height = Math.min(element.scrollHeight, 190) + "px"; }, [draft, textareaRef]);
  return <div className="relative rounded-2xl border bg-card p-3 pb-12 text-left shadow-[var(--shadow-md)] transition-shadow focus-within:ring-3 focus-within:ring-ring/15"><Textarea ref={textareaRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask anything about your product, users, or performance..." disabled={enabled === false} aria-label="Message Movcues AI" className="min-h-24 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0" /><span className="absolute bottom-3 left-4 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>{loading ? <Button type="button" size="icon" variant="outline" className="absolute bottom-2.5 right-3 size-8" onClick={stop} aria-label="Stop response"><Square className="size-3 fill-current" /></Button> : <Button type="button" size="icon" className="absolute bottom-2.5 right-3 size-8 rounded-lg" disabled={!draft.trim() || enabled === false} onClick={() => void submit()} aria-label="Send message"><ArrowUp /></Button>}</div>;
}

function Suggestion({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof Sparkles; onClick: () => void; disabled: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-xl border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"><Icon className="size-3.5" />{label}</button>; }

function ProposalCard({ proposal, approval, busy, approve, reject }: { proposal: AiProposal; approval: AiMessage["approval"]; busy: boolean; approve: () => void; reject: () => void }) {
  const pending = approval?.status === "pending";
  return <Card className="mt-4 overflow-hidden"><div className="border-b bg-muted/30 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{proposal.type} preview</p><h3 className="mt-0.5 font-semibold">{proposal.data.name}</h3></div>{approval?.status !== "pending" && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium"><Check className="size-3" />{approval?.status ?? "Preview"}</span>}</div>{proposal.data.description && <p className="mt-1 text-sm text-muted-foreground">{proposal.data.description}</p>}</div><div className="p-4"><ProposalDetails proposal={proposal} />{pending && <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" size="sm" disabled={busy} onClick={reject}>Reject</Button><Button size="sm" disabled={busy} onClick={approve}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}Approve and create</Button></div>}</div></Card>;
}

function ProposalDetails({ proposal }: { proposal: AiProposal }) {
  if (proposal.type === "dashboard") return <div className="grid gap-2 sm:grid-cols-2">{proposal.data.cards.map((card, index) => <div key={card.title + index} className="rounded-lg border p-3"><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.cardType} · {card.width}</span><p className="mt-1 text-sm font-medium">{card.title}</p></div>)}</div>;
  if (proposal.type === "funnel") return <ol className="space-y-2">{proposal.data.steps.map((step, index) => <li key={index} className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><span className="text-sm"><b>{step.label || (step.type === "event" ? step.eventName : step.pageId)}</b><span className="ml-2 text-xs text-muted-foreground">{step.type}</span></span></li>)}</ol>;
  return <SegmentDefinitionView group={proposal.data.definition} />;
}

function SegmentDefinitionView({ group, depth = 0 }: { group: SegmentGroup; depth?: number }) { return <div className={cn("space-y-2 rounded-lg border p-3", depth > 0 && "ml-3 bg-muted/20")}><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Match {group.logic === "and" ? "all" : "any"}</span>{group.conditions.map((condition, index) => "logic" in condition ? <SegmentDefinitionView key={index} group={condition as SegmentGroup} depth={depth + 1} /> : <div key={index} className="rounded-md bg-muted/60 px-3 py-2 text-xs">{conditionSummary(condition)}</div>)}</div>; }
function conditionSummary(condition: Record<string, unknown>) { return Object.entries(condition).map(([key, value]) => key + ": " + (typeof value === "object" ? JSON.stringify(value) : String(value))).join(" · "); }

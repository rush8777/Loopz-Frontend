import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowUp, BarChart3, Check, Clock3, History, Lightbulb, LoaderCircle, MoreHorizontal, Plus, Square, Trash2, X, type LucideIcon } from "lucide-react";
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
  const [revealingMessageId, setRevealingMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const revealCancelRef = useRef<(() => void) | null>(null);

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

  useEffect(() => { if (typeof bottomRef.current?.scrollIntoView === "function") bottomRef.current.scrollIntoView({ behavior: revealingMessageId ? "auto" : "smooth", block: "end" }); }, [messages, loading, revealingMessageId]);

  async function openConversation(id: string) {
    if (!currentOrg || !currentSite) return;
    setError(null); setLoading(true);
    try { const result = await aiApi.getAiConversation(currentOrg.orgId, currentSite.id, id); setConversationId(id); setMessages(result.messages); setHistoryOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open this conversation."); }
    finally { setLoading(false); }
  }

  function stopResponse() { abortRef.current?.abort(); revealCancelRef.current?.(); }

  function newConversation() {
    stopResponse(); setConversationId(null); setMessages([]); setDraft(""); setError(null); setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function submit(content = draft) {
    const prompt = content.trim();
    if (!prompt || loading || revealingMessageId || !currentOrg || !currentSite || enabled === false) return;
    setError(null); setDraft(""); setLoading(true);
    const optimistic: AiMessage = { id: "optimistic-" + Date.now(), role: "user", content: prompt, evidence: [], proposal: null, approval: null, createdAt: new Date().toISOString() };
    setMessages(previous => [...previous, optimistic]);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let activeId = conversationId;
      if (!activeId) { const created = await aiApi.createAiConversation(currentOrg.orgId, currentSite.id); activeId = created.id; setConversationId(created.id); }
      const result = await aiApi.sendAiMessage(currentOrg.orgId, currentSite.id, activeId, prompt, controller.signal);
      setLoading(false);
      await revealAssistantMessage(result.userMessage, result.assistantMessage, optimistic.id);
      await refreshConversations();
    } catch (reason) {
      if ((reason as Error)?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Movcues AI could not complete that request.");
      setMessages(previous => previous.filter(message => message.id !== optimistic.id)); setDraft(prompt);
    } finally { setLoading(false); abortRef.current = null; }
  }

  function revealAssistantMessage(userMessage: AiMessage, assistantMessage: AiMessage, optimisticId: string) {
    const chunks = assistantMessage.content.match(/\S+\s*|\s+/g) ?? [assistantMessage.content];
    const chunkSize = Math.max(1, Math.ceil(chunks.length / 140));
    const shell: AiMessage = { ...assistantMessage, content: "", evidence: [], proposal: null, approval: null };
    setMessages(previous => [...previous.filter(message => message.id !== optimisticId), userMessage, shell]);
    setRevealingMessageId(assistantMessage.id);
    return new Promise<void>(resolve => {
      let index = 0; let cancelled = false;
      const finish = (completed: boolean) => {
        revealCancelRef.current = null; setRevealingMessageId(null);
        if (completed) setMessages(previous => previous.map(message => message.id === assistantMessage.id ? assistantMessage : message));
        resolve();
      };
      revealCancelRef.current = () => { cancelled = true; };
      const reveal = () => {
        if (cancelled) { finish(false); return; }
        index = Math.min(chunks.length, index + chunkSize);
        const visible = chunks.slice(0, index).join("");
        setMessages(previous => previous.map(message => message.id === assistantMessage.id ? { ...message, content: visible } : message));
        if (index >= chunks.length) { finish(true); return; }
        window.setTimeout(reveal, 28);
      };
      window.setTimeout(reveal, 80);
    });
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
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 py-3 backdrop-blur">
      <div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => setHistoryOpen(value => !value)} aria-label="Conversation history" title="Conversation history"><History /></Button><Button variant="outline" size="icon" onClick={newConversation} aria-label="New chat" title="New chat"><Plus /></Button></div>
      <img src="/movcues_logo.png" alt="movcues" className="h-8 w-auto object-contain" />
    </div>
    <div className="relative flex min-h-0 flex-1">
      {historyOpen && <aside className="absolute right-0 top-3 z-20 w-[min(340px,calc(100vw-2rem))] rounded-xl border bg-card p-2 shadow-lg" aria-label="Conversation history"><div className="flex items-center justify-between px-2 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent conversations</span><Button variant="ghost" size="icon" className="size-7" onClick={() => setHistoryOpen(false)} aria-label="Close history"><X /></Button></div><div className="mt-1 max-h-[60vh] space-y-1 overflow-y-auto">{conversations.length ? conversations.map(item => <div key={item.id} className={cn("group flex items-center rounded-lg", item.id === conversationId && "bg-muted")}><button className="min-w-0 flex-1 px-2 py-2 text-left" onClick={() => void openConversation(item.id)}><span className="block truncate text-sm font-medium">{item.title}</span><span className="block text-[11px] text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</span></button><Button variant="ghost" size="icon" className="mr-1 size-7 opacity-0 group-hover:opacity-100" onClick={() => void removeConversation(item.id)} aria-label={"Delete " + item.title}><Trash2 /></Button></div>) : <p className="px-2 py-8 text-center text-sm text-muted-foreground">No conversations yet.</p>}</div></aside>}
      {messages.length === 0 ? <Welcome firstName={firstName} draft={draft} setDraft={setDraft} submit={submit} loading={loading} enabled={enabled} moreOpen={moreOpen} setMoreOpen={setMoreOpen} textareaRef={textareaRef} error={error} /> : <Conversation messages={messages} draft={draft} setDraft={setDraft} submit={submit} loading={loading} revealingMessageId={revealingMessageId} enabled={enabled} error={error} textareaRef={textareaRef} bottomRef={bottomRef} stop={stopResponse} decide={decide} approving={approving} />}
    </div>
  </div>;
}

function Welcome(props: { firstName: string; draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; enabled: boolean | null; moreOpen: boolean; setMoreOpen: (v: boolean) => void; textareaRef: RefObject<HTMLTextAreaElement | null>; error: string | null }) {
  return <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-1 py-14 text-center sm:px-6"><div className="mb-6 grid size-14 place-items-center rounded-2xl border bg-card shadow-sm"><AiOrbMark size="hero" /></div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {props.firstName}</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Explore product performance, understand users, and turn findings into Movcues resources.</p><div className="mt-8 w-full"><Composer {...props} /><div className="mt-4 flex flex-wrap justify-center gap-2">{suggestions.map(item => <Suggestion key={item.label} label={item.label} icon={item.icon} onClick={() => void props.submit(item.prompt)} disabled={props.loading || props.enabled === false} />)}<Suggestion label="More" icon={MoreHorizontal} onClick={() => props.setMoreOpen(!props.moreOpen)} disabled={props.loading || props.enabled === false} /></div>{props.moreOpen && <div className="mx-auto mt-2 flex max-w-2xl flex-wrap justify-center gap-2">{moreSuggestions.map(prompt => <button key={prompt} type="button" className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground" onClick={() => void props.submit(prompt)}>{prompt}</button>)}</div>}</div>{props.enabled === false && <p className="mt-5 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-800">Movcues AI is disabled until a backend provider is configured.</p>}{props.error && <p role="alert" className="mt-5 text-sm text-destructive">{props.error}</p>}</div>;
}

function Conversation(props: { messages: AiMessage[]; draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; revealingMessageId: string | null; enabled: boolean | null; error: string | null; textareaRef: RefObject<HTMLTextAreaElement | null>; bottomRef: RefObject<HTMLDivElement | null>; stop: () => void; decide: (message: AiMessage, action: "approve" | "reject") => Promise<void>; approving: string | null }) {
  return <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col"><div className="flex-1 space-y-6 overflow-y-auto py-8 pr-1">{props.messages.map(message => <Message key={message.id} message={message} revealing={message.id === props.revealingMessageId} decide={props.decide} approving={props.approving} />)}{props.loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid size-7 place-items-center rounded-lg border bg-card"><AiOrbMark animating /></span>Analyzing your Movcues data…</div>}{props.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{props.error}</div>}<div ref={props.bottomRef} /></div><div className="sticky bottom-0 bg-background pb-4 pt-3"><Composer {...props} loading={props.loading || Boolean(props.revealingMessageId)} /></div></div>;
}

function Message({ message, revealing, decide, approving }: { message: AiMessage; revealing?: boolean; decide: (message: AiMessage, action: "approve" | "reject") => Promise<void>; approving: string | null }) {
  if (message.role === "user") return <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-muted px-4 py-3 text-sm leading-6">{message.content}</div>;
  return <article className="flex gap-3"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border bg-card shadow-sm"><AiOrbMark animating={revealing} /></span><div className="min-w-0 flex-1"><div className="ai-markdown text-sm leading-6"><MarkdownLite source={message.content} />{revealing && <span className="ai-response-cursor" aria-label="Response is being revealed" />}</div>{message.proposal && <ProposalCard proposal={message.proposal} approval={message.approval} busy={approving === message.approval?.id} approve={() => void decide(message, "approve")} reject={() => void decide(message, "reject")} />}{message.evidence.length > 0 && <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Sources and limitations ({message.evidence.length})</summary><ul className="mt-2 space-y-1.5">{message.evidence.map((item, index) => <li key={item.source + "-" + index} className="rounded-md border bg-muted/30 px-3 py-2"><span className="font-medium text-foreground">{item.label}</span> · {item.source}{item.range && <> · {new Date(item.range.since).toLocaleDateString()}–{new Date(item.range.until).toLocaleDateString()}</>}{item.sampleSize !== undefined && <> · n={item.sampleSize}</>}{item.limitation && <span className="mt-1 block">{item.limitation}</span>}</li>)}</ul></details>}</div></article>;
}

function AiOrbMark({ animating = false, size }: { animating?: boolean; size?: "hero" }) { return <span className={cn("ai-orb-mark", animating && "is-animating", size === "hero" && "ai-orb-mark--hero")} aria-hidden="true"><i /><i /></span>; }

function MarkdownLite({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim(); const code: string[] = []; index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      nodes.push(<pre key={"code-" + index}><code className={language ? "language-" + language : undefined}>{code.join("\n")}</code></pre>); continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (heading) { const Tag = ("h" + heading[1].length) as "h1" | "h2" | "h3" | "h4"; nodes.push(<Tag key={"heading-" + index}>{inline(heading[2])}</Tag>); index += 1; continue; }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { nodes.push(<hr key={"rule-" + index} />); index += 1; continue; }
    if (isTableStart(lines, index)) { const headers = tableCells(lines[index]); const rows: string[][] = []; index += 2; while (index < lines.length && lines[index].includes("|")) rows.push(tableCells(lines[index++])); nodes.push(<div className="ai-markdown-table" key={"table-" + index}><table><thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{inline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div>); continue; }
    if (/^>\s?/.test(line)) { const quote: string[] = []; while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, "")); nodes.push(<blockquote key={"quote-" + index}>{inline(quote.join(" "))}</blockquote>); continue; }
    const listMatch = /^(\s*)([-*+] |\d+\. )(.+)$/.exec(line);
    if (listMatch) { const ordered = /\d+\. /.test(listMatch[2]); const items: string[] = []; while (index < lines.length) { const item = /^(\s*)([-*+] |\d+\. )(.+)$/.exec(lines[index]); if (!item || /\d+\. /.test(item[2]) !== ordered) break; items.push(item[3]); index += 1; } const List = ordered ? "ol" : "ul"; nodes.push(<List key={"list-" + index}>{items.map((item, itemIndex) => <li key={itemIndex}>{taskOrInline(item)}</li>)}</List>); continue; }
    const paragraph: string[] = [line.trim()]; index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim());
    nodes.push(<p key={"paragraph-" + index}>{inline(paragraph.join(" "))}</p>);
  }
  return <>{nodes}</>;
}

function isTableStart(lines: string[], index: number) { return lines[index].includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? ""); }
function isBlockStart(lines: string[], index: number) { return /^```|^(#{1,4})\s+|^>\s?|^(\s*)([-*+] |\d+\. )|^\s{0,3}([-*_])(?:\s*\3){2,}\s*$/.test(lines[index]) || isTableStart(lines, index); }
function tableCells(line: string) { return line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()); }
function taskOrInline(value: string) { const task = /^\[([ xX])\]\s+(.+)$/.exec(value); return task ? <><input type="checkbox" checked={task[1].toLowerCase() === "x"} readOnly />{inline(task[2])}</> : inline(value); }
function inline(value: string): ReactNode[] {
  const expression = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^\s)]+\)|\*[^*]+\*|_[^_]+_)/g;
  return value.split(expression).filter(Boolean).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part); if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function Composer({ draft, setDraft, submit, loading, enabled, textareaRef, stop }: { draft: string; setDraft: (v: string) => void; submit: (v?: string) => Promise<void>; loading: boolean; enabled: boolean | null; textareaRef: RefObject<HTMLTextAreaElement | null>; stop?: () => void }) {
  useEffect(() => { const element = textareaRef.current; if (!element) return; element.style.height = "0px"; element.style.height = Math.min(element.scrollHeight, 190) + "px"; }, [draft, textareaRef]);
  return <div className="relative rounded-2xl border bg-card p-3 pb-12 text-left shadow-[var(--shadow-md)] transition-shadow focus-within:ring-3 focus-within:ring-ring/15"><Textarea ref={textareaRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask anything about your product, users, or performance..." disabled={enabled === false} aria-label="Message Movcues AI" className="min-h-24 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0" /><span className="absolute bottom-3 left-4 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>{loading ? <Button type="button" size="icon" variant="outline" className="absolute bottom-2.5 right-3 size-8" onClick={stop} aria-label="Stop response"><Square className="size-3 fill-current" /></Button> : <Button type="button" size="icon" className="absolute bottom-2.5 right-3 size-8 rounded-lg" disabled={!draft.trim() || enabled === false} onClick={() => void submit()} aria-label="Send message"><ArrowUp /></Button>}</div>;
}

function Suggestion({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-xl border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"><Icon className="size-3.5" />{label}</button>; }

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

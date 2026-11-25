import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from "@movcues/ui";
import { Plus, Search } from "lucide-react";
import { useWorkspace } from "@/auth/WorkspaceContext";
import { knowledgeApi, type KnowledgeDocument, type KnowledgeMatch, type KnowledgeSource, type KnowledgeSourceInput, type KnowledgeSourceType, type KnowledgeVisibility, type SourceConfig } from "@/api/knowledge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { DataTableFrame, ErrorNotice, LoadingRows, dataTableClass } from "@/components/PageSurface";
import { formatRelativeTime } from "@/lib/format";

const names: Record<KnowledgeSourceType, string> = { website: "Website", url: "Article URL", file: "File", manual: "Manual article" };
const fieldClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const statusLabels = { idle: "Idle", disabled: "Disabled", queued: "Queued", processing: "Processing", ready: "Ready", failed: "Failed" };
const errors: Record<string, string> = {
  fetch_failed: "Couldn’t fetch the source. Check that it is public and try again.",
  source_http_error: "The site returned an error. Check the URL and sync again.",
  blocked_address: "This URL resolves to a restricted network address.",
  blocked_url: "Enter a public HTTP or HTTPS documentation URL.",
  no_indexable_text: "No readable text was found. Try a direct article URL or upload a text file.",
  invalid_pdf: "The file does not have a valid PDF header.",
  pdf_extraction_failed: "The PDF could not be read. Try an unlocked, text-based PDF.",
  file_size_limit: "The file exceeds the configured upload limit.",
  unsupported_content_type: "The URL did not return a supported document type.",
  embedding_request_failed: "The embedding provider returned an error. Sync again after checking its status.",
};
const explain = (error: unknown) => error instanceof Error ? errors[error.message] ?? error.message : "Something went wrong. Try again.";
const working = (source: KnowledgeSource) => source.status === "queued" || source.status === "processing";

export function KnowledgePage() {
  const { currentOrg, currentSite } = useWorkspace();
  if (!currentOrg || !currentSite) return <EmptyState title="Choose a site" description="Select a site to manage its knowledge." />;
  if (!["OWNER", "ADMIN"].includes(currentOrg.role)) {
    return <EmptyState title="Administrator access required" description="Ask a workspace administrator to manage this site’s knowledge." />;
  }
  return <SiteKnowledge key={`${currentOrg.orgId}/${currentSite.id}`} orgId={currentOrg.orgId} siteId={currentSite.id} />;
}

function SiteKnowledge({ orgId, siteId }: { orgId: string; siteId: string }) {
  const api = useMemo(() => knowledgeApi(orgId, siteId), [orgId, siteId]);
  const [sources, setSources] = useState<KnowledgeSource[] | null>(null);
  const [error, setError] = useState("");
  const [version, refresh] = useState(0);
  const [editor, setEditor] = useState<"new" | (KnowledgeSource & { config: SourceConfig }) | null>(null);
  const [inspecting, setInspecting] = useState<KnowledgeSource | null>(null);
  const [removing, setRemoving] = useState<KnowledgeSource | null>(null);
  const [updating, setUpdating] = useState(false);
  const [question, setQuestion] = useState("");
  const [querying, setQuerying] = useState(false);
  const [querySource, setQuerySource] = useState("");
  const [matches, setMatches] = useState<KnowledgeMatch[] | null>(null);
  const [queryError, setQueryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const result = await api.list(controller.signal);
        if (controller.signal.aborted) return;
        setSources(result);
        if (result.some(working)) timeout = setTimeout(load, 2500);
      } catch (failure) { if (!controller.signal.aborted) setError(explain(failure)); }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [api, version]);

  async function mutate(action: () => Promise<unknown>) {
    setUpdating(true);
    setError("");
    try { await action(); refresh(value => value + 1); }
    catch (failure) { setError(explain(failure)); }
    finally { setUpdating(false); }
  }
  async function retrieve(event: FormEvent) {
    event.preventDefault();
    setQuerying(true);
    setQueryError("");
    setMatches(null);
    try { setMatches(await api.retrieve(question, querySource ? [querySource] : undefined)); }
    catch (failure) { setQueryError(explain(failure)); }
    finally { setQuerying(false); }
  }

  return <>
    <PageHeader section="Workspace" title="Knowledge" description="Manage the documents Geo Agent can use to answer questions." actions={
      <Button onClick={() => setEditor("new")}><Plus />Add source</Button>
    } />
    {error && <ErrorNotice>{error} <Button size="sm" variant="ghost" onClick={() => { setError(""); refresh(value => value + 1); }}>Reload</Button></ErrorNotice>}
    <DataTableFrame>
      {!sources && !error && <LoadingRows />}
      {sources?.length === 0 && <EmptyState title="No knowledge sources" description="Add your help center, an article or a file to get started." />}
      {Boolean(sources?.length) && <div className="overflow-x-auto">
        <table className={dataTableClass}>
          <thead><tr><th>Source</th><th>Type</th><th>Documents</th><th>Status</th><th>Last sync</th><th>Actions</th></tr></thead>
          <tbody>{sources?.map(source => <tr key={source.id}>
            <td><button className="font-medium underline-offset-4 hover:underline" onClick={() => setInspecting(source)}>{source.name}</button><div className="text-xs text-muted-foreground">{source.visibility === "public" ? "Visitor access" : "Private"}</div></td>
            <td>{names[source.type]}</td><td>{source.documentCount}</td>
            <td><Badge variant="outline">{statusLabels[source.status]}</Badge>
              {source.job?.status === "processing" && source.job.total > 0 && <div className="text-xs text-muted-foreground">{source.job.completed} of {source.job.total}</div>}
              {source.job?.errorCode && <div className="max-w-56 text-xs text-muted-foreground">{errors[source.job.errorCode] ?? source.job.errorCode.replaceAll("_", " ")}</div>}
            </td>
            <td>{source.lastSyncedAt ? formatRelativeTime(source.lastSyncedAt) : "Never"}</td>
            <td><div className="flex flex-wrap gap-1">
              {working(source) && source.job ? <Button size="sm" variant="ghost" disabled={updating} onClick={() => void mutate(() => api.cancel(source.id, source.job!.id))}>Cancel</Button>
                : <Button size="sm" variant="ghost" disabled={updating || !source.enabled} onClick={() => void mutate(() => api.sync(source.id))}>Sync</Button>}
              <Button size="sm" variant="ghost" disabled={updating} onClick={() => void mutate(async () => setEditor(await api.details(source.id)))}>Edit</Button>
              <Button size="sm" variant="ghost" disabled={updating} onClick={() => void mutate(() => api.update(source.id, { enabled: !source.enabled }))}>{source.enabled ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="ghost" disabled={updating} onClick={() => setRemoving(source)}>Delete</Button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </DataTableFrame>

    <section aria-labelledby="knowledge-test-title" className="mt-6 space-y-3 rounded-xl border bg-card p-4">
      <h2 id="knowledge-test-title" className="font-semibold">Test retrieval</h2>
      <form className="flex flex-wrap items-end gap-2" onSubmit={retrieve}>
        <Label className="grid min-w-48 flex-1 gap-1.5">Question<Input value={question} onChange={event => setQuestion(event.target.value)} required maxLength={1200} placeholder="How do I create an invoice?" /></Label>
        <Label className="grid gap-1.5">Source<select className={fieldClass} value={querySource} onChange={event => setQuerySource(event.target.value)}>
          <option value="">All enabled sources</option>{sources?.filter(source => source.enabled).map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
        </select></Label>
        <Button type="submit" disabled={querying || !question.trim()}><Search />{querying ? "Searching…" : "Search"}</Button>
      </form>
      {queryError && <ErrorNotice>{queryError}</ErrorNotice>}
      {matches?.length === 0 && <p role="status" className="text-sm text-muted-foreground">No relevant excerpts found.</p>}
      {matches?.map(match => <article key={match.chunkId} className="rounded-md border p-3 text-sm">
        <h3 className="font-medium">{match.title}</h3>
        {match.heading && <p className="text-xs text-muted-foreground">{match.heading}</p>}
        <p className="my-2 whitespace-pre-wrap break-words">{match.content}</p>
        {match.url && <a className="break-all underline" href={match.url} rel="noreferrer" target="_blank">View source</a>}
      </article>)}
    </section>

    {editor && <SourceEditor source={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSave={async (input) => {
      if (editor === "new") await api.create(input);
      else {
        const { type, config, ...settings } = input;
        await api.update(editor.id, type === "file" && !config.data ? settings : { ...settings, config });
      }
      setEditor(null);
      refresh(value => value + 1);
    }} />}
    {inspecting && <DocumentInspector source={inspecting} api={api} onClose={() => setInspecting(null)} />}
    {removing && <Dialog open onOpenChange={open => { if (!open) setRemoving(null); }}><DialogContent>
      <DialogHeader><DialogTitle>Delete {removing.name}?</DialogTitle><DialogDescription>Its documents will be removed from search and Geo Agent.</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="destructive" disabled={updating} onClick={() => void mutate(async () => { await api.delete(removing.id); setRemoving(null); })}>Delete source</Button></DialogFooter>
    </DialogContent></Dialog>}
  </>;
}

function SourceEditor({ source, onClose, onSave }: {
  source: (KnowledgeSource & { config: SourceConfig }) | null;
  onClose: () => void;
  onSave: (input: KnowledgeSourceInput) => Promise<void>;
}) {
  const [type, setType] = useState<KnowledgeSourceType>(source?.type ?? "website");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const config = source?.config;
  const web = type === "website" || type === "url";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (field: string) => String(form.get(field) ?? "").trim();
    const paths = (field: string) => value(field).split("\n").map(path => path.trim()).filter(Boolean);
    setSaving(true);
    setError("");
    try {
      let sourceConfig: SourceConfig;
      if (type === "manual") sourceConfig = { title: value("title"), content: value("content"), url: value("url") || undefined };
      else if (type === "website") sourceConfig = {
        url: value("url"), pageLimit: Number(value("pageLimit")), crawlDepth: Number(value("crawlDepth")),
        includePaths: paths("includePaths"), excludePaths: paths("excludePaths"),
      };
      else if (type === "url") sourceConfig = { url: value("url") };
      else {
        if (file && file.size > 5_000_000) throw new Error("file_size_limit");
        const data = file ? await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.readAsDataURL(file);
        }) : undefined;
        sourceConfig = { filename: file?.name ?? config?.filename, data };
      }
      await onSave({ type, name: value("name"), visibility: value("visibility") as KnowledgeVisibility, syncHours: web && value("syncHours") ? Number(value("syncHours")) : null, config: sourceConfig });
    } catch (failure) { setError(explain(failure)); }
    finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{source ? "Edit source" : "Add knowledge source"}</DialogTitle><DialogDescription>Choose which documents to index for this site.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-3">
      {!source && <Label className="grid gap-1.5">Source type<select className={fieldClass} value={type} onChange={event => setType(event.target.value as KnowledgeSourceType)}>
        {Object.entries(names).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></Label>}
      <Label className="grid gap-1.5">Name<Input name="name" defaultValue={source?.name} maxLength={120} required /></Label>
      {web && <Label className="grid gap-1.5">Documentation URL<Input type="url" name="url" required defaultValue={config?.url} /></Label>}
      {type === "website" && <>
        <div className="grid grid-cols-2 gap-3"><Label className="grid gap-1.5">Page limit<Input name="pageLimit" type="number" min={1} max={50} defaultValue={config?.pageLimit ?? 20} required /></Label>
          <Label className="grid gap-1.5">Crawl depth<Input name="crawlDepth" type="number" min={0} max={5} defaultValue={config?.crawlDepth ?? 2} required /></Label></div>
        <Label className="grid gap-1.5">Include paths, one per line<Textarea name="includePaths" placeholder="/help" defaultValue={config?.includePaths?.join("\n")} /></Label>
        <Label className="grid gap-1.5">Exclude paths, one per line<Textarea name="excludePaths" placeholder="/help/archive" defaultValue={config?.excludePaths?.join("\n")} /></Label>
      </>}
      {web && <Label className="grid gap-1.5">Sync schedule<select name="syncHours" className={fieldClass} defaultValue={source?.syncHours ?? ""}>
        <option value="">Manual</option><option value="6">Every six hours</option><option value="24">Daily</option><option value="168">Weekly</option>
        {source?.syncHours && ![6, 24, 168].includes(source.syncHours) && <option value={source.syncHours}>Every {source.syncHours} hours</option>}
      </select></Label>}
      {type === "file" && <Label className="grid gap-1.5">{config?.filename ? `Replace ${config.filename}` : "PDF, TXT or Markdown file"}<Input type="file" accept=".pdf,.txt,.md,.markdown" required={!source} onChange={event => setFile(event.target.files?.[0] ?? null)} /></Label>}
      {type === "manual" && <>
        <Label className="grid gap-1.5">Article title<Input name="title" defaultValue={config?.title} maxLength={200} required /></Label>
        <Label className="grid gap-1.5">Content<Textarea name="content" defaultValue={config?.content} rows={8} maxLength={120000} required /></Label>
        <Label className="grid gap-1.5">Source reference (optional)<Input type="url" name="url" defaultValue={config?.url} /></Label>
      </>}
      <Label className="grid gap-1.5">Access<select name="visibility" className={fieldClass} defaultValue={source?.visibility ?? "private"}>
        <option value="private">Private to administrators</option><option value="public">Available to visitors through Geo Agent</option>
      </select></Label>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving} type="submit">{saving ? "Saving…" : source ? "Save source" : "Add source"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function DocumentInspector({ source, api, onClose }: { source: KnowledgeSource; api: ReturnType<typeof knowledgeApi>; onClose: () => void }) {
  const [documents, setDocuments] = useState<KnowledgeDocument[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void api.documents(source.id).then(result => { if (active) setDocuments(result); })
      .catch(failure => { if (active) setError(explain(failure)); });
    return () => { active = false; };
  }, [api, source.id]);
  async function exclude(document: KnowledgeDocument) {
    setBusy(true);
    setError("");
    try {
      await api.setExcluded(source.id, document.id, !document.excluded);
      setDocuments(await api.documents(source.id));
    } catch (failure) { setError(explain(failure)); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{source.name}</DialogTitle><DialogDescription>Indexed documents and their availability in retrieval.</DialogDescription></DialogHeader>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    {!documents && !error && <p role="status">Loading documents…</p>}
    {documents?.length === 0 && <p className="text-sm text-muted-foreground">No indexed documents yet.</p>}
    <ul className="divide-y">{documents?.map(document => <li key={document.id} className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0 break-words text-sm">{document.title}{document.url && <div><a className="text-xs underline" href={document.url} target="_blank" rel="noreferrer">View source</a></div>}</div>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void exclude(document)}>{document.excluded ? "Include" : "Exclude"}</Button>
    </li>)}</ul>
  </DialogContent></Dialog>;
}

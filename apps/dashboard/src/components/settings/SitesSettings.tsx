import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@movecues/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function SitesSettings() {
  const { currentOrg, sites, currentSite, setCurrentSiteId, refreshSites } = useWorkspace();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [editingSite, setEditingSite] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";

  useEffect(() => {
    setSiteName(currentSite?.name ?? "");
    setDomain(currentSite?.domain ?? "");
    setEditingSite(false);
    setDeleteOpen(false);
    setDeleteConfirmation("");
    setDeleteError(null);
  }, [currentSite?.id, currentSite?.name, currentSite?.domain]);

  function beginEditing() {
    if (!currentSite) return;
    setSiteName(currentSite.name);
    setDomain(currentSite.domain ?? "");
    setError(null);
    setEditingSite(true);
  }

  function cancelEditing() {
    setSiteName(currentSite?.name ?? "");
    setDomain(currentSite?.domain ?? "");
    setError(null);
    setEditingSite(false);
  }

  async function onCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !newSiteName.trim() || !canManage) return;
    setCreating(true);
    setError(null);
    try {
      const site = await sitesApi.createSite(currentOrg.orgId, {
        name: newSiteName.trim(),
        ...(newSiteDomain.trim() ? { domain: newSiteDomain.trim() } : {}),
      });
      await refreshSites();
      setCurrentSiteId(site.id);
      setCreatingSite(false);
      setNewSiteName("");
      setNewSiteDomain("");
    } catch {
      setError("Couldn't create the site. Check the name and primary domain.");
    } finally {
      setCreating(false);
    }
  }

  async function onSaveSite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !currentSite || !canManage || !siteName.trim()) return;
    setSavingSite(true);
    setError(null);
    try {
      await sitesApi.updateSite(currentOrg.orgId, currentSite.id, {
        name: siteName.trim(),
        domain: domain.trim() || null,
      });
      await refreshSites();
      setEditingSite(false);
    } catch {
      setError("Enter a valid site name and an origin such as https://app.example.com.");
    } finally {
      setSavingSite(false);
    }
  }

  function openDeleteDialog() {
    setDeleteConfirmation("");
    setDeleteError(null);
    setDeleteOpen(true);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirmation("");
    setDeleteError(null);
  }

  async function onDeleteSite() {
    if (!currentOrg || !currentSite || !canManage || deleteConfirmation !== currentSite.name) return;
    const nextSite = sites.find((site) => site.id !== currentSite.id) ?? null;
    setDeleting(true);
    setDeleteError(null);
    try {
      await sitesApi.deleteSite(currentOrg.orgId, currentSite.id);
      setCurrentSiteId(nextSite?.id ?? null);
      await refreshSites();
      setDeleteOpen(false);
      setDeleteConfirmation("");
    } catch {
      setDeleteError("Couldn't delete this site. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <SettingsHeading title="Sites" description="Manage the sites connected to this workspace." />
      <div className="mb-5 flex flex-col gap-2" aria-label="Sites">
        {sites.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">No sites yet.</div>}
        {sites.map((site) => {
          const isCurrent = site.id === currentSite?.id;
          return (
            <button
              type="button"
              key={site.id}
              className={`flex w-full items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors hover:bg-accent${isCurrent ? " border-primary/40" : ""}`}
              onClick={() => setCurrentSiteId(site.id)}
              aria-pressed={isCurrent}
            >
              <span className={`size-2 rounded-full border${isCurrent ? " border-primary bg-primary" : " border-muted-foreground"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px] font-medium">{site.name}</strong>
                <span className="block truncate text-xs text-muted-foreground">{site.domain ?? "No domain set"}</span>
              </span>
              {isCurrent && <Badge variant="outline">Current</Badge>}
            </button>
          );
        })}
      </div>

      {currentSite && <>
        <SettingsGroup title="Selected site">
          {canManage && editingSite ? (
            <form className="space-y-3 p-3.5" onSubmit={(event) => void onSaveSite(event)}>
              <div className="grid gap-1.5">
                <Label htmlFor="site-name">Site name</Label>
                <Input id="site-name" autoFocus value={siteName} onChange={(event) => setSiteName(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="site-domain">Primary domain</Label>
                <Input id="site-domain" placeholder="https://app.example.com" value={domain} onChange={(event) => setDomain(event.target.value)} />
                <p className="m-0 text-xs text-muted-foreground">Use the exact origin that hosts your product.</p>
              </div>
              {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
              <div className="flex gap-2">
                <Button type="submit" disabled={savingSite || !siteName.trim()}>{savingSite ? "Saving…" : "Save changes"}</Button>
                <Button type="button" variant="ghost" onClick={cancelEditing} disabled={savingSite}>Cancel</Button>
              </div>
            </form>
          ) : <>
            <SettingsRow
              label="Site name"
              value={currentSite.name}
              action={canManage ? <Button type="button" variant="outline" size="sm" onClick={beginEditing}><Pencil />Rename</Button> : undefined}
            />
            <SettingsRow label="Primary domain" value={currentSite.domain ?? "Not set"} />
          </>}
          <SettingsRow label="Site ID" value={currentSite.siteId} mono action={<CopyButton value={currentSite.siteId} label="Site ID" />} />
        </SettingsGroup>

        {canManage && <SettingsGroup title="Danger zone">
          <div className="flex items-center justify-between gap-4 p-3.5">
            <div>
              <div className="text-sm font-medium">Delete this site</div>
              <p className="mt-1 mb-0 text-xs text-muted-foreground">Permanently removes this site and all of its collected data.</p>
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={openDeleteDialog}><Trash2 />Delete site…</Button>
          </div>
        </SettingsGroup>}
      </>}

      {canManage && (!creatingSite ? (
        <Button type="button" aria-label="+ Add site" onClick={() => { setError(null); setCreatingSite(true); }} disabled={!currentOrg}><Plus />Add site</Button>
      ) : (
        <form className="flex max-w-sm flex-col gap-3" onSubmit={(event) => void onCreateSite(event)}>
          <div className="grid gap-1.5">
            <Label htmlFor="new-site-name">Site name</Label>
            <Input id="new-site-name" autoFocus placeholder="My website" value={newSiteName} onChange={(event) => setNewSiteName(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-site-domain">Primary domain (optional)</Label>
            <Input id="new-site-domain" placeholder="https://app.example.com" value={newSiteDomain} onChange={(event) => setNewSiteDomain(event.target.value)} />
          </div>
          {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !newSiteName.trim()}>{creating ? "Creating…" : "Create site"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setCreatingSite(false); setError(null); }} disabled={creating}>Cancel</Button>
          </div>
        </form>
      ))}

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4 pr-12">
            <DialogTitle className="text-[17px] tracking-[-0.01em]">Delete {currentSite?.name}?</DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              This permanently deletes the site and all associated analytics data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 p-5">
            <Label htmlFor="delete-site-confirmation">Type <strong>{currentSite?.name}</strong> to confirm</Label>
            <Input
              id="delete-site-confirmation"
              autoFocus
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />
            {deleteError && <Alert className="mt-2 border-destructive/25 bg-red-50 text-destructive">{deleteError}</Alert>}
          </div>
          <DialogFooter className="border-t px-5 py-3">
            <Button type="button" variant="ghost" onClick={closeDeleteDialog} disabled={deleting}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onDeleteSite()}
              disabled={deleting || !currentSite || deleteConfirmation !== currentSite.name}
            >
              {deleting ? "Deleting…" : "Delete site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

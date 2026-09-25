import { useEffect, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Input, Label } from "@movecues/ui";
import { Plus } from "lucide-react";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function SitesSettings() {
  const { currentOrg, sites, currentSite, setCurrentSiteId, refreshSites } = useWorkspace();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";

  useEffect(() => {
    setSiteName(currentSite?.name ?? "");
    setDomain(currentSite?.domain ?? "");
  }, [currentSite?.id, currentSite?.name, currentSite?.domain]);

  async function onCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !newSiteName.trim() || !canManage) return;
    setCreating(true);
    setError(null);
    try {
      const site = await sitesApi.createSite(currentOrg.orgId, { name: newSiteName.trim(), ...(newSiteDomain.trim() ? { domain: newSiteDomain.trim() } : {}) });
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
      await sitesApi.updateSite(currentOrg.orgId, currentSite.id, { name: siteName.trim(), domain: domain.trim() || null });
      await refreshSites();
    } catch {
      setError("Enter a valid site name and an origin such as https://app.example.com.");
    } finally {
      setSavingSite(false);
    }
  }

  return (
    <div>
      <SettingsHeading title="Sites" description="Manage the sites connected to this workspace." />
      <div className="mb-5 flex flex-col gap-2" aria-label="Sites">
        {sites.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">No sites yet.</div>}
        {sites.map((site) => {
          const isCurrent = site.id === currentSite?.id;
          return <button type="button" key={site.id} className={`flex w-full items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors hover:bg-accent${isCurrent ? " border-primary/40" : ""}`} onClick={() => setCurrentSiteId(site.id)} aria-pressed={isCurrent}><span className={`size-2 rounded-full border${isCurrent ? " border-primary bg-primary" : " border-muted-foreground"}`} aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block truncate text-[13px] font-medium">{site.name}</strong><span className="block truncate text-xs text-muted-foreground">{site.domain ?? "No domain set"}</span></span>{isCurrent && <Badge variant="outline">Current</Badge>}</button>;
        })}
      </div>

      {currentSite && <SettingsGroup title="Selected site">
        {canManage ? <form className="space-y-3 p-3.5" onSubmit={(event) => void onSaveSite(event)}><div className="grid gap-1.5"><Label htmlFor="site-name">Site name</Label><Input id="site-name" value={siteName} onChange={(event) => setSiteName(event.target.value)} /></div><div className="grid gap-1.5"><Label htmlFor="site-domain">Primary domain</Label><Input id="site-domain" placeholder="https://app.example.com" value={domain} onChange={(event) => setDomain(event.target.value)} /><p className="m-0 text-xs text-muted-foreground">Use the exact origin that hosts your product.</p></div>{error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}<Button type="submit" variant="outline" disabled={savingSite || !siteName.trim()}>{savingSite ? "Saving…" : "Save site"}</Button></form> : <><SettingsRow label="Site name" value={currentSite.name} /><SettingsRow label="Primary domain" value={currentSite.domain ?? "Not set"} /></>}
        <SettingsRow label="Site ID" value={currentSite.siteId} mono action={<CopyButton value={currentSite.siteId} label="Site ID" />} />
      </SettingsGroup>}

      {canManage && (!creatingSite ? <Button type="button" aria-label="+ Add site" onClick={() => setCreatingSite(true)} disabled={!currentOrg}><Plus />Add site</Button> : <form className="flex max-w-sm flex-col gap-3" onSubmit={(event) => void onCreateSite(event)}><div className="grid gap-1.5"><Label htmlFor="new-site-name">Site name</Label><Input id="new-site-name" autoFocus placeholder="My website" value={newSiteName} onChange={(event) => setNewSiteName(event.target.value)} /></div><div className="grid gap-1.5"><Label htmlFor="new-site-domain">Primary domain (optional)</Label><Input id="new-site-domain" placeholder="https://app.example.com" value={newSiteDomain} onChange={(event) => setNewSiteDomain(event.target.value)} /></div>{error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}<div className="flex gap-2"><Button type="submit" disabled={creating || !newSiteName.trim()}>{creating ? "Creating…" : "Create site"}</Button><Button type="button" variant="ghost" onClick={() => setCreatingSite(false)} disabled={creating}>Cancel</Button></div></form>)}
    </div>
  );
}

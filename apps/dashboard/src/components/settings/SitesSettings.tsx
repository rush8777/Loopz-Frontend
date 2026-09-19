import { useEffect, useState, type FormEvent } from "react";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { SettingsHeading } from "./SettingsShared";
import { Plus } from "lucide-react";
import { Alert } from "@movecues/ui";
import { Badge } from "@movecues/ui";
import { Button } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { Label } from "@movecues/ui";

export function SitesSettings() {
  const { currentOrg, sites, currentSite, setCurrentSiteId, refreshSites } = useWorkspace();
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [domain, setDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDomain(currentSite?.domain ?? ""), [currentSite?.id, currentSite?.domain]);

  async function onCreateSite(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !newSiteName.trim()) return;
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
      setError("Couldn't create the site. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function onSaveDomain(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !currentSite) return;
    setSavingDomain(true);
    setError(null);
    try {
      await sitesApi.updateSiteDomain(currentOrg.orgId, currentSite.id, domain.trim() || null);
      await refreshSites();
    } catch {
      setError("Enter a valid origin, such as http://127.0.0.1:8080.");
    } finally {
      setSavingDomain(false);
    }
  }

  return (
    <div>
      <SettingsHeading title="Sites" description="Choose which site movecues uses across the workspace." />
      <div className="mb-5 flex flex-col gap-2" aria-label="Sites">
        {sites.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">No sites yet.</div>}
        {sites.map((site) => {
          const isCurrent = site.id === currentSite?.id;
          return (
            <button
              type="button"
              key={site.id}
              className={`flex w-full items-center gap-3 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20${isCurrent ? " border-primary/40" : ""}`}
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

      {currentSite && (
        <form className="mb-5 grid max-w-lg gap-2" onSubmit={(event) => void onSaveDomain(event)}>
          <Label htmlFor="site-domain">Site domain</Label>
          <div className="flex gap-2">
            <Input id="site-domain" placeholder="https://app.example.com" value={domain} onChange={(event) => setDomain(event.target.value)} />
            <Button type="submit" variant="outline" disabled={savingDomain}>{savingDomain ? "Saving…" : "Save domain"}</Button>
          </div>
          <p className="m-0 text-xs text-muted-foreground">Use the exact origin that hosts your product. For the local SDK example: http://127.0.0.1:8080.</p>
        </form>
      )}

      {!creatingSite ? (
        <Button type="button" aria-label="+ Add site" onClick={() => setCreatingSite(true)} disabled={!currentOrg}><Plus/>Add site</Button>
      ) : (
        <form className="flex max-w-sm flex-col gap-3" onSubmit={(event) => void onCreateSite(event)}>
          <div className="grid gap-1.5">
            <Label htmlFor="new-site-name">Site name</Label>
            <Input id="new-site-name"
              autoFocus
              placeholder="My website"
              value={newSiteName}
              onChange={(event) => setNewSiteName(event.target.value)}
            /></div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-site-domain">Site domain (optional)</Label>
            <Input id="new-site-domain" placeholder="https://app.example.com" value={newSiteDomain} onChange={(event) => setNewSiteDomain(event.target.value)} />
          </div>
          {error && <Alert className="border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !newSiteName.trim()}>
              {creating ? "Creating…" : "Create site"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreatingSite(false)} disabled={creating}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

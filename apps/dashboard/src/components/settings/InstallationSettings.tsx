import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button } from "@movecues/ui";
import * as sitesApi from "../../api/sites";
import { useWorkspace } from "../../auth/WorkspaceContext";
import type { SiteStatus } from "../../types/api";
import { CopyButton, NoSiteMessage, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

function installationSnippet(siteId: string) {
  return `<script async src="https://cdn.movcues.com/v1.js" data-site-id="${siteId}"></script>`;
}

function lastEventLabel(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export function InstallationSettings() {
  const { currentOrg, currentSite } = useWorkspace();
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!currentOrg || !currentSite) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await sitesApi.getSiteStatus(currentOrg.orgId, currentSite.id));
    } catch {
      setError("Couldn't refresh installation status.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg, currentSite]);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  return (
    <div>
      <SettingsHeading title="Installation" description="Install Movecues and verify that this site is sending data." />
      {!currentSite ? <NoSiteMessage /> : <>
        {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
        <SettingsGroup title="Installation status">
          <div className="flex items-center justify-between gap-3 p-3.5"><div><div className="flex items-center gap-2 text-sm font-medium">{status?.hasReceivedEvents ? "Receiving data" : "Waiting for data"}<Badge variant="outline">{status?.hasReceivedEvents ? "Active" : "No data yet"}</Badge></div><p className="mt-1 mb-0 text-xs text-muted-foreground">{status?.lastEventAt ? `Last event ${lastEventLabel(status.lastEventAt)}` : "Install the SDK and open your product."}</p></div><Button type="button" variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={loading}>{loading ? "Refreshing…" : "Refresh status"}</Button></div>
        </SettingsGroup>
        <SettingsGroup><SettingsRow label="Site ID" value={currentSite.siteId} mono action={<CopyButton value={currentSite.siteId} label="Site ID" />} /></SettingsGroup>
        <SettingsGroup title="Installation snippet"><div className="relative"><pre className="mono m-0 overflow-auto p-4 pr-24 text-xs leading-5 text-muted-foreground">{installationSnippet(currentSite.siteId)}</pre><div className="absolute top-2 right-2"><CopyButton value={installationSnippet(currentSite.siteId)} label="installation snippet" /></div></div></SettingsGroup>
      </>}
    </div>
  );
}

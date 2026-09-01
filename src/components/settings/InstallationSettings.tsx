import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, NoSiteMessage, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

function installationSnippet(siteId: string) {
  return `npm install loopz

import { createAnalytics } from "loopz";

const analytics = createAnalytics({ siteId: "${siteId}" });`;
}

export function InstallationSettings() {
  const { currentSite } = useWorkspace();

  return (
    <div>
      <SettingsHeading title="Installation" description="Add the Loopz SDK to your application." />
      {!currentSite ? (
        <NoSiteMessage />
      ) : (
        <>
          <SettingsGroup>
            <SettingsRow
              label="Site ID"
              value={currentSite.siteId}
              mono
              action={<CopyButton value={currentSite.siteId} label="Site ID" />}
            />
          </SettingsGroup>
          <SettingsGroup title="Install Loopz">
            <div className="relative">
              <pre className="mono m-0 overflow-auto p-4 pr-24 text-xs leading-5 text-muted-foreground">{installationSnippet(currentSite.siteId)}</pre>
              <div className="absolute top-2 right-2">
              <CopyButton value={installationSnippet(currentSite.siteId)} label="installation snippet" />
              </div>
            </div>
          </SettingsGroup>
        </>
      )}
    </div>
  );
}

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
            <div className="settings-code-wrap">
              <pre className="settings-code mono">{installationSnippet(currentSite.siteId)}</pre>
              <CopyButton value={installationSnippet(currentSite.siteId)} label="installation snippet" />
            </div>
          </SettingsGroup>
        </>
      )}
    </div>
  );
}

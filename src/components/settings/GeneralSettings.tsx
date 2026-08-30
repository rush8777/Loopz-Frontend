import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, NoSiteMessage, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function GeneralSettings() {
  const { currentOrg, currentSite } = useWorkspace();

  return (
    <div>
      <SettingsHeading title="General" description="Your current workspace and site context." />
      <SettingsGroup title="Workspace">
        <SettingsRow label="Organization" value={currentOrg?.name ?? "No organization selected"} />
        {currentSite ? (
          <>
            <SettingsRow label="Current site" value={currentSite.name} />
            <SettingsRow label="Domain" value={currentSite.domain ?? "Not set"} />
            <SettingsRow
              label="Site ID"
              value={currentSite.siteId}
              mono
              action={<CopyButton value={currentSite.siteId} label="Site ID" />}
            />
          </>
        ) : (
          <NoSiteMessage />
        )}
      </SettingsGroup>
    </div>
  );
}

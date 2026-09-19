import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, NoSiteMessage, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function DeveloperSettings() {
  const { currentSite } = useWorkspace();
  if (!currentSite) {
    return (
      <div>
        <SettingsHeading title="Developer" description="Public identifiers and SDK configuration." />
        <NoSiteMessage />
      </div>
    );
  }

  const config = `{ siteId: "${currentSite.siteId}" }`;
  return (
    <div>
      <SettingsHeading title="Developer" description="Public identifiers and SDK configuration." />
      <SettingsGroup>
        <SettingsRow label="Site ID" value={currentSite.siteId} mono action={<CopyButton value={currentSite.siteId} label="Site ID" />} />
        <SettingsRow label="Internal site ID" value={currentSite.id} mono action={<CopyButton value={currentSite.id} label="internal site ID" />} />
        <SettingsRow label="SDK/public configuration" value={config} mono action={<CopyButton value={config} label="SDK configuration" />} />
      </SettingsGroup>
    </div>
  );
}

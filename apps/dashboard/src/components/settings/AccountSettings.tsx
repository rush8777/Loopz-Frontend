import { useAuth } from "../../auth/AuthContext";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";
import { Button } from "@movecues/ui";

export function AccountSettings() {
  const { user, logout } = useAuth();
  const { orgs, currentOrg, setCurrentOrgId } = useWorkspace();

  return (
    <div>
      <SettingsHeading title="Account" description="Your account and organization membership." />
      <SettingsGroup>
        <SettingsRow label="Email" value={user?.email ?? "Unavailable"} />
        <SettingsRow label="Workspace" value={currentOrg?.name ?? "No organization selected"} />
        <SettingsRow label="Role" value={currentOrg?.role ?? "Unavailable"} />
        {orgs.length > 1 && (
          <SettingsRow
            label="Organization"
            value={
              <select
                className="h-9 w-full max-w-60 rounded-md border bg-input px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20"
                aria-label="Organization"
                value={currentOrg?.orgId ?? ""}
                onChange={(event) => setCurrentOrgId(event.target.value)}
              >
                {orgs.map((org) => (
                  <option key={org.orgId} value={org.orgId}>{org.name}</option>
                ))}
              </select>
            }
          />
        )}
      </SettingsGroup>
      <Button type="button" variant="outline" className="text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}

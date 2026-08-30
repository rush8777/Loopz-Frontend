import { useAuth } from "../../auth/AuthContext";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

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
                className="input settings-select"
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
      <button type="button" className="btn settings-sign-out" onClick={() => void logout()}>
        Sign out
      </button>
    </div>
  );
}

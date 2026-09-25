import { useAuth } from "../../auth/AuthContext";
import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";
import { Button } from "@movecues/ui";

export function AccountSettings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <SettingsHeading title="Account" description="Your personal Movecues account." />
      <SettingsGroup>
        <SettingsRow label="Name" value={user?.name ?? "Not set"} />
        <SettingsRow label="Email" value={user?.email ?? "Unavailable"} />
      </SettingsGroup>
      <Button type="button" variant="outline" className="text-destructive hover:bg-red-50 hover:text-destructive" onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}

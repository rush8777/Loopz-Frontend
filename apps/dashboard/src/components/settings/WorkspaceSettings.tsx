import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Input, Label } from "@movecues/ui";
import * as organizationsApi from "../../api/organizations";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { CopyButton, SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function WorkspaceSettings() {
  const { orgs, currentOrg, setCurrentOrgId, refreshOrgs } = useWorkspace();
  const [name, setName] = useState(currentOrg?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = currentOrg?.role === "OWNER" || currentOrg?.role === "ADMIN";

  useEffect(() => setName(currentOrg?.name ?? ""), [currentOrg?.orgId, currentOrg?.name]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!currentOrg || !canManage || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await organizationsApi.updateOrganization(currentOrg.orgId, { name: name.trim() });
      await refreshOrgs?.();
    } catch {
      setError("Couldn't update the workspace name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SettingsHeading title="Workspace" description="Manage this workspace's identity and access context." />
      {error && <Alert className="mb-4 border-destructive/25 bg-red-50 text-destructive">{error}</Alert>}
      <SettingsGroup>
        {orgs.length > 1 && <SettingsRow label="Current workspace" value={<select aria-label="Current workspace" value={currentOrg?.orgId ?? ""} onChange={(event) => setCurrentOrgId(event.target.value)} className="h-9 w-full max-w-60 rounded-md border bg-input px-3 text-sm">{orgs.map((organization) => <option key={organization.orgId} value={organization.orgId}>{organization.name}</option>)}</select>} />}
        <SettingsRow
          label="Workspace name"
          value={canManage ? (
            <form className="flex max-w-sm gap-2" onSubmit={(event) => void save(event)}>
              <Label htmlFor="workspace-name" className="sr-only">Workspace name</Label>
              <Input id="workspace-name" value={name} onChange={(event) => setName(event.target.value)} />
              <Button type="submit" variant="outline" disabled={saving || !name.trim() || name.trim() === currentOrg?.name}>{saving ? "Saving…" : "Save"}</Button>
            </form>
          ) : currentOrg?.name ?? "No workspace selected"}
        />
        {currentOrg && <SettingsRow label="Workspace ID" value={currentOrg.orgId} mono action={<CopyButton value={currentOrg.orgId} label="Workspace ID" />} />}
        <SettingsRow label="Your role" value={currentOrg?.role ?? "Unavailable"} />
      </SettingsGroup>
    </div>
  );
}

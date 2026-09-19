import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function DataPrivacySettings() {
  return (
    <div>
      <SettingsHeading title="Data & Privacy" description="Data collection capabilities available in the movecues SDK." />
      <SettingsGroup title="Data collection">
        <SettingsRow label="Autocapture" value={<span className="settings-status">Enabled by default</span>} />
        <SettingsRow label="Anonymous visitors" value={<span className="settings-status">Supported</span>} />
        <SettingsRow label="Identity resolution" value={<span className="settings-status">Supported via identify()</span>} />
        <SettingsRow label="Custom events" value={<span className="settings-status">Supported</span>} />
      </SettingsGroup>
      <p className="text-xs text-muted-foreground">These are SDK capabilities, not workspace-level toggles.</p>
    </div>
  );
}

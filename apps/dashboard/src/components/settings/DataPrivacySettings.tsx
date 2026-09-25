import { SettingsGroup, SettingsHeading, SettingsRow } from "./SettingsShared";

export function DataPrivacySettings() {
  return (
    <div>
      <SettingsHeading title="Data & Privacy" description="Understand what the Movecues SDK can collect." />
      <SettingsGroup title="Collection behavior">
        <SettingsRow label="Autocapture" value={<span className="settings-status">Enabled by default</span>} />
        <SettingsRow label="Anonymous visitors" value={<span className="settings-status">Supported</span>} />
        <SettingsRow label="Identity resolution" value={<span className="settings-status">Supported via identify()</span>} />
        <SettingsRow label="Custom events" value={<span className="settings-status">Supported</span>} />
      </SettingsGroup>
      <p className="text-xs leading-5 text-muted-foreground">These labels describe SDK capabilities. They are not workspace settings and changing this page does not alter collection behavior.</p>
    </div>
  );
}

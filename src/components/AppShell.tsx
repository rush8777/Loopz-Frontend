import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SettingsModal, type SettingsSection } from "./settings/SettingsModal";

export function AppShell() {
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const openSettings = useCallback((section: SettingsSection = "general") => setSettingsSection(section), []);
  const closeSettings = useCallback(() => setSettingsSection(null), []);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar onOpenSettings={openSettings} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <main style={{ padding: 28, maxWidth: 1200 }}>
          <Outlet />
        </main>
      </div>
      {settingsSection && (
        <SettingsModal
          initialSection={settingsSection}
          onSectionChange={setSettingsSection}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}

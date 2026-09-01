import { useCallback, useState } from "react";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { SettingsModal, type SettingsSection } from "./settings/SettingsModal";
export function AppShell() {
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openSettings = useCallback((section: SettingsSection = "general") => { setMobileNavOpen(false); setSettingsSection(section); }, []);
  const closeSettings = useCallback(() => setSettingsSection(null), []);
  return <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
    <Sidebar onOpenSettings={openSettings} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
    <div className="min-w-0"><header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur lg:hidden"><Button type="button" variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu /></Button><span className="ml-2 text-sm font-semibold">Loopz</span></header><main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main></div>
    {settingsSection && <SettingsModal initialSection={settingsSection} onSectionChange={setSettingsSection} onClose={closeSettings} />}
  </div>;
}

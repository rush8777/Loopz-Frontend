import { useCallback, useState } from "react";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { SettingsModal, type SettingsSection } from "./settings/SettingsModal";
export function AppShell() {
  const [settingsSection, setSettingsSection] = useState<SettingsSection | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const openSettings = useCallback((section: SettingsSection = "general") => { setMobileNavOpen(false); setSettingsSection(section); }, []);
  const closeSettings = useCallback(() => setSettingsSection(null), []);
  return <div className={`min-h-dvh bg-background lg:grid lg:transition-[grid-template-columns] lg:duration-200 ${sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[208px_minmax(0,1fr)]"}`}>
    <Sidebar onOpenSettings={openSettings} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
    <div className="relative min-w-0"><div className="pointer-events-none absolute right-8 top-5 z-20 hidden lg:flex"><img src="/movecues_logo.png" alt="movecues" className="h-8 w-auto object-contain" /></div><header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur lg:hidden"><Button type="button" variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu /></Button><img src="/movecues_logo.png" alt="movecues" className="ml-2 h-7 w-auto object-contain" /></header><main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main></div>
    {settingsSection && <SettingsModal initialSection={settingsSection} onSectionChange={setSettingsSection} onClose={closeSettings} />}
  </div>;
}

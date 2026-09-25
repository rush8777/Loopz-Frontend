import { BarChart2, Grip, UserRoundPen, CheckSquare, ChevronDown, FileText, Flame, Gauge, LayoutTemplate, ListChecks, MousePointerClick, Network, PanelLeftClose, PanelLeftOpen, Settings, Users, Waypoints, X } from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { useWorkspace } from "@/auth/WorkspaceContext";
import { useRef, useState } from "react";
import { Button } from "@movecues/ui";
import { cn } from "@movecues/ui";
import type { SettingsSection } from "./settings/SettingsModal";

interface NavItem { label: string; path?: string; disabled?: boolean; icon: ComponentType<{ className?: string }> }
interface NavSection { label: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  { label: "Workspace", items: [{ label: "Overview", path: "/analytics", icon: Gauge }, { label: "Dashboards", path: "/dashboard", icon: BarChart2 }] },
  { label: "Experiences", items: [{ label: "Surveys", path: "/experiences/surveys", icon: ListChecks }, { label: "Guides", path: "/experiences/guides", icon: LayoutTemplate  }, { label: "Banners", path: "/experiences/banners", icon: Grip }, { label: "Checklists", path: "/experiences/checklists", icon: CheckSquare }] },
  { label: "Observe", items: [{ label: "Pages", path: "/observe/pages", icon: FileText }, { label: "Sessions", path: "/observe/sessions", icon: MousePointerClick }, { label: "Events", path: "/observe/events", icon: Waypoints }, { label: "Funnels", path: "/observe/funnels", icon: Network }, { label: "Heatmaps", path: "/observe/heatmaps", disabled: true, icon: Flame }] },
  { label: "People", items: [ { label: "Segments", path: "/segments", icon: UserRoundPen },{ label: "Users", path: "/users", icon: Users }] },
];

interface SidebarProps {
  onOpenSettings: (section?: SettingsSection) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function useScrollState() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleScroll() {
    setIsScrolling(true);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setIsScrolling(false), 700);
  }
  return { isScrolling, handleScroll };
}



/* ────────────────────────────────────────────────────────────────────────
   4. Aurora glass — glass panel with a soft blurred color wash bleeding
   through it (two blurred blobs behind the blur layer), still neutral
   text/content so it stays usable, not decorative-heavy.
   ──────────────────────────────────────────────────────────────────────── */
export function Sidebar({ onOpenSettings, collapsed = false, onCollapsedChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { currentSite } = useWorkspace();
  const { isScrolling, handleScroll } = useScrollState();

  const content = (compact: boolean, mobile: boolean) => (
    <aside className={cn("relative flex h-full flex-col overflow-hidden border-r border-white/30 transition-[padding] duration-200", compact ? "p-2" : "p-3")}>
      <div className="pointer-events-none absolute -left-16 -top-20 size-72 rounded-full bg-[#3b82f6]/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-[#60a5fa]/50 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-56 -translate-x-1/2 rounded-full bg-[#93c5fd]/40 blur-3xl" />
      <div className="absolute inset-0 bg-white/35 backdrop-blur-2xl backdrop-saturate-150" />

      <div className={cn("relative flex h-11 items-center", compact ? "justify-center px-1" : "px-2")}>
        {!compact && <button type="button" onClick={() => onOpenSettings("sites")} aria-label="Select site" className="flex min-w-0 items-center gap-1.5 text-left text-sm font-medium text-[#141414] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20"><span className="truncate">{currentSite?.name ?? "Select site"}</span><ChevronDown className="size-3.5 shrink-0 text-[#474747]" /></button>}
        {mobile ? <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={onMobileClose} aria-label="Close navigation"><X /></Button> : <Button variant="ghost" size="icon" className={cn("hidden text-[#474747] hover:bg-white/50 lg:inline-flex", compact ? "size-6" : "ml-auto size-8")} onClick={() => onCollapsedChange?.(!collapsed)} aria-label={compact ? "Expand navigation" : "Collapse navigation"}>{compact ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>}
      </div>
      <nav onScroll={handleScroll} className={cn("sidebar-scrollbar relative mt-5 flex-1 overflow-y-auto", compact ? "space-y-4" : "space-y-5", isScrolling && "is-scrolling")} aria-label="Main navigation">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {!compact && <div className="mb-1 px-2 text-[10px] font-semibold uppercase text-[#474747]/70">{section.label}</div>}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return item.disabled || !item.path ? (
                  <div key={item.label} title={compact ? item.label : undefined} className={cn("flex h-8 items-center rounded-lg text-[13px] text-[#141414]/35", compact ? "justify-center" : "gap-2 px-2")} aria-disabled="true">
                    <Icon className="size-4" />{!compact && <><span className="flex-1">{item.label}</span><span className="rounded border border-white/50 px-1 text-[10px]">Soon</span></>}
                  </div>
                ) : (
                  <NavLink key={item.path} to={item.path} onClick={onMobileClose} aria-label={compact ? item.label : undefined} title={compact ? item.label : undefined} className={({ isActive }) => cn("flex h-8 items-center rounded-lg text-[13px] text-[#474747] transition-colors hover:bg-white/50 hover:text-[#141414] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20", compact ? "justify-center" : "gap-2 px-2", isActive && "bg-[#eff6ff]/80 font-medium text-[#1d4ed8] shadow-[0_1px_2px_rgba(59,130,246,0.15)]")}>
                    <Icon className="size-4" />{!compact && item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <Button type="button" variant="ghost" title={compact ? "Settings" : undefined} className={cn("relative w-full text-[#474747] hover:bg-white/50", compact ? "justify-center" : "justify-start")} onClick={() => onOpenSettings("workspace")}><Settings />{!compact && "Settings"}</Button>
    </aside>
  );

  return (
    <>
      <div className={cn("sticky top-0 hidden h-dvh transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-[208px]")}>{content(collapsed, false)}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/25" onClick={onMobileClose} aria-label="Close navigation overlay" />
          <div className="absolute inset-y-0 left-0 w-[min(280px,85vw)] shadow-xl">{content(false, true)}</div>
        </div>
      )}
    </>
  );
}

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Building2, Code2, Database, Globe2, Settings2, UserRound, X } from "lucide-react";
import { Button } from "@movecues/ui";
import { cn } from "@movecues/ui";
import { AccountSettings } from "./AccountSettings";
import { DataPrivacySettings } from "./DataPrivacySettings";
import { DeveloperSettings } from "./DeveloperSettings";
import { GeneralSettings } from "./GeneralSettings";
import { InstallationSettings } from "./InstallationSettings";
import { SitesSettings } from "./SitesSettings";
export type SettingsSection="general"|"sites"|"installation"|"privacy"|"developer"|"account";
const SECTIONS=[{id:"general",label:"General",icon:Settings2},{id:"sites",label:"Sites",icon:Globe2},{id:"installation",label:"Installation",icon:Code2},{id:"privacy",label:"Data & Privacy",icon:Database},{id:"developer",label:"Developer",icon:Building2},{id:"account",label:"Account",icon:UserRound}] satisfies {id:SettingsSection;label:string;icon:typeof Settings2}[];
export function SettingsModal({initialSection,onSectionChange,onClose}:{initialSection:SettingsSection;onSectionChange:(section:SettingsSection)=>void;onClose:()=>void}) {
  return <DialogPrimitive.Root open onOpenChange={open=>{if(!open)onClose()}}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-2 backdrop-blur-[1px] sm:p-6" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <DialogPrimitive.Content aria-describedby={undefined} className="flex h-[min(680px,calc(100dvh-16px))] w-full max-w-[860px] flex-col overflow-hidden rounded-xl border bg-card shadow-[oklab(0_0_0/.06)_0_0_0_1px,rgba(0,0,0,.1)_0_1px_3px] focus:outline-none sm:h-[min(620px,calc(100dvh-48px))]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-5"><DialogPrimitive.Title className="text-base font-semibold">Settings</DialogPrimitive.Title><DialogPrimitive.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close settings"><X/></Button></DialogPrimitive.Close></header>
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[190px_minmax(0,1fr)] md:grid-rows-1"><nav className="flex gap-1 overflow-x-auto border-b bg-[#fafafa] p-2 md:flex-col md:border-r md:border-b-0 md:p-3" aria-label="Settings sections">{SECTIONS.map(section=>{const Icon=section.icon;return <button type="button" key={section.id} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20",initialSection===section.id&&"bg-accent font-medium text-foreground")} onClick={()=>onSectionChange(section.id)} aria-current={initialSection===section.id?"page":undefined}><Icon className="size-4"/>{section.label}</button>})}</nav>
        <div className="min-w-0 overflow-y-auto p-4 sm:p-6 md:p-7">{initialSection==="general"&&<GeneralSettings/>}{initialSection==="sites"&&<SitesSettings/>}{initialSection==="installation"&&<InstallationSettings/>}{initialSection==="privacy"&&<DataPrivacySettings/>}{initialSection==="developer"&&<DeveloperSettings/>}{initialSection==="account"&&<AccountSettings/>}</div>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Overlay></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

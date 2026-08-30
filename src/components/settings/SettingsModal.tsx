import { useEffect, useRef } from "react";
import { AccountSettings } from "./AccountSettings";
import { DataPrivacySettings } from "./DataPrivacySettings";
import { DeveloperSettings } from "./DeveloperSettings";
import { GeneralSettings } from "./GeneralSettings";
import { InstallationSettings } from "./InstallationSettings";
import { SitesSettings } from "./SitesSettings";

export type SettingsSection = "general" | "sites" | "installation" | "privacy" | "developer" | "account";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "sites", label: "Sites" },
  { id: "installation", label: "Installation" },
  { id: "privacy", label: "Data & Privacy" },
  { id: "developer", label: "Developer" },
  { id: "account", label: "Account" },
];

export function SettingsModal({
  initialSection,
  onSectionChange,
  onClose,
}: {
  initialSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-modal-header">
          <h1 id="settings-title">Settings</h1>
          <button ref={closeButtonRef} type="button" className="btn btn-ghost settings-close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>
        <div className="settings-modal-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map((section) => (
              <button
                type="button"
                key={section.id}
                className={initialSection === section.id ? "is-active" : ""}
                onClick={() => onSectionChange(section.id)}
                aria-current={initialSection === section.id ? "page" : undefined}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="settings-content scrollable">
            {initialSection === "general" && <GeneralSettings />}
            {initialSection === "sites" && <SitesSettings />}
            {initialSection === "installation" && <InstallationSettings />}
            {initialSection === "privacy" && <DataPrivacySettings />}
            {initialSection === "developer" && <DeveloperSettings />}
            {initialSection === "account" && <AccountSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

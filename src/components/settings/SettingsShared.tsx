import { useState } from "react";

export function SettingsHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="settings-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="settings-group">
      {title && <h3>{title}</h3>}
      <div className="settings-group-body">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  value,
  mono = false,
  action,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-label">{label}</div>
      <div className={`settings-row-value${mono ? " mono" : ""}`}>{value}</div>
      {action && <div className="settings-row-action">{action}</div>}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailed(true);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()} aria-label={`Copy ${label}`}>
      {failed ? "Copy failed" : copied ? "Copied" : "Copy"}
    </button>
  );
}

export function NoSiteMessage() {
  return <div className="settings-empty">Create or select a site to see this information.</div>;
}

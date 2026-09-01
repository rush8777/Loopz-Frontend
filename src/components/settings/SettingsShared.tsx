import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 mb-0 text-[13px] text-muted-foreground">{description}</p>}
    </header>
  );
}

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      {title && <h3 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h3>}
      <div className="overflow-hidden rounded-lg border bg-card">{children}</div>
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
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
      <div className="col-span-2 text-xs text-muted-foreground sm:col-span-1">{label}</div>
      <div className={`min-w-0 [overflow-wrap:anywhere] text-[13px]${mono ? " mono" : ""}`}>{value}</div>
      {action && <div>{action}</div>}
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
    <Button type="button" variant="ghost" size="sm" onClick={() => void copy()} aria-label={`Copy ${label}`}>
      {copied ? <Check/> : <Copy/>}{failed ? "Copy failed" : copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function NoSiteMessage() {
  return <div className="rounded-lg border border-dashed p-6 text-center text-[13px] text-muted-foreground">Create or select a site to see this information.</div>;
}

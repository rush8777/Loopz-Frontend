import type { ReactNode } from "react";
import { cn } from "@movcues/ui";

type Props = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function AnalyticsMetricCard({ label, value, description, selected = false, onClick }: Props) {
  const className = cn("h-[144px] min-w-0 w-full rounded-xl border bg-card p-4 text-left transition-colors", onClick && "hover:border-foreground/20 hover:bg-muted/20", selected && "border-primary/40 bg-primary/[0.025]");
  const content = <><span className="block truncate text-sm font-medium text-foreground" title={typeof label === "string" ? label : undefined}>{label}</span><strong className="mt-2 block text-2xl font-semibold tracking-tight text-foreground">{value}</strong><span className="mt-1 block truncate text-xs text-muted-foreground" title={typeof description === "string" ? description : undefined}>{description}</span></>;
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>;
}

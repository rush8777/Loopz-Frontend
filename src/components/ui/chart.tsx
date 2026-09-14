import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;
const ChartContext = React.createContext<ChartConfig>({});
export function ChartContainer({ config, className, children }: { config: ChartConfig; className?: string; children: React.ReactElement }) {
  return <ChartContext.Provider value={config}><div className={cn("h-64 w-full text-xs", className)}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></ChartContext.Provider>;
}
export const ChartTooltip = Tooltip;
export function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  const config = React.useContext(ChartContext); if (!active || !payload?.length) return null;
  return <div className="min-w-32 rounded-md border bg-card p-2 shadow-md"><div className="mb-1 font-medium">{label}</div>{payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 text-muted-foreground"><span>{config[item.name ?? ""]?.label ?? item.name}</span><span className="font-mono text-foreground">{Number(item.value ?? 0).toLocaleString()}</span></div>)}</div>;
}

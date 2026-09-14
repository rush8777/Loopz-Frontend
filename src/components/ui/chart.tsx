import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatTooltipDate } from "@/lib/chartFormatting";

export type ChartConfig = Record<string, { label?: React.ReactNode; color?: string }>;
export type ChartRenderSize = { width: number; height: number };
const ChartContext = React.createContext<ChartConfig>({});
export function ChartContainer({ config, className, children }: { config: ChartConfig; className?: string; children: React.ReactElement | ((size: ChartRenderSize) => React.ReactElement) }) {
  const [size, setSize] = React.useState<ChartRenderSize>({ width: 0, height: 0 });
  const handleResize = React.useCallback((width: number, height: number) => setSize((current) => current.width === width && current.height === height ? current : { width, height }), []);
  const chart = typeof children === "function" ? children(size) : children;
  return <ChartContext.Provider value={config}><div className={cn("h-64 w-full text-xs", className)}><ResponsiveContainer width="100%" height="100%" onResize={handleResize}>{chart}</ResponsiveContainer></div></ChartContext.Provider>;
}
export const ChartTooltip = Tooltip;
export function ChartTooltipContent({ active, payload, label, labelFormatter = formatTooltipDate }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string; labelFormatter?: (label?: string | number) => React.ReactNode }) {
  const config = React.useContext(ChartContext); if (!active || !payload?.length) return null;
  return <div className="min-w-32 rounded-md border bg-card p-2 shadow-md"><div className="mb-1 font-medium">{labelFormatter(label)}</div>{payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 text-muted-foreground"><span>{config[item.name ?? ""]?.label ?? item.name}</span><span className="font-mono text-foreground">{Number(item.value ?? 0).toLocaleString()}</span></div>)}</div>;
}

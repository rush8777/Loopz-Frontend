import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FilterToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-3", className)}>{children}</div>;
}

export function DataTableFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full overflow-x-auto rounded-lg border bg-card", className)}>{children}</div>;
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return <div className="space-y-2 p-4">{Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div>;
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return <Alert className="border-destructive/25 bg-red-50 text-destructive"><AlertCircle /><AlertDescription className="text-destructive">{children}</AlertDescription></Alert>;
}

export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}

export function Metric({ label, value, detail, labelClassName }: { label: string; value: ReactNode; detail?: ReactNode; labelClassName?: string }) {
  return <div className="min-w-0 bg-card px-4 py-3"><div className={cn("text-[10px] font-semibold uppercase text-muted-foreground", labelClassName)}>{label}</div><div className="mt-1 break-words text-[15px] font-semibold text-foreground">{value}</div>{detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}</div>;
}

export const dataTableClass = "w-full min-w-[680px] border-collapse text-[13px] [&_th]:border-b [&_th]:bg-[#fafafa] [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:text-muted-foreground [&_td]:border-b [&_td]:px-4 [&_td]:py-3 [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40";

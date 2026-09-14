import { ArrowRight, ChevronDown, ChevronUp, Copy, Info, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/format";

export function DashboardCardHeader({ title, definition, editable, onEdit, onDuplicate, onDelete, onMove }: { title: string; definition?: string; editable?: boolean; onEdit?: () => void; onDuplicate?: () => void; onDelete?: () => void; onMove?: (delta: number) => void }) {
  return <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pb-3 pt-4"><div className="min-w-0 flex-1"><CardTitle className="flex items-center gap-1.5"><span className="truncate">{title}</span>{definition && <TooltipProvider><Tooltip><TooltipTrigger aria-label="Metric definition"><Info className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent className="max-w-72">{definition}</TooltipContent></Tooltip></TooltipProvider>}</CardTitle></div>
    {editable && <div className="flex max-w-full shrink-0 flex-wrap"><Button variant="ghost" size="icon" aria-label="Move card earlier" onClick={() => onMove?.(-1)}><ChevronUp /></Button><Button variant="ghost" size="icon" aria-label="Move card later" onClick={() => onMove?.(1)}><ChevronDown /></Button><Button variant="ghost" size="icon" aria-label="Edit card" onClick={onEdit}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Duplicate card" onClick={onDuplicate}><Copy /></Button><Button variant="ghost" size="icon" aria-label="Delete card" onClick={onDelete}><Trash2 /></Button></div>}
  </CardHeader>;
}

export function DashboardCardFooter({ dataFreshness, onDrilldown, canDrilldown }: { dataFreshness?: string; onDrilldown?: () => void; canDrilldown?: boolean }) {
  if (!dataFreshness) return null;
  const refreshedAt = new Date(dataFreshness);
  return <CardFooter className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t px-5 py-2.5 text-[11px] text-muted-foreground"><time dateTime={dataFreshness} title={refreshedAt.toLocaleString()}>Updated {formatRelativeTime(dataFreshness)}</time>{canDrilldown && onDrilldown && <Button size="sm" variant="ghost" className="ml-auto h-7 shrink-0 px-2 text-xs" onClick={onDrilldown}>View details<ArrowRight className="size-3.5" /></Button>}</CardFooter>;
}

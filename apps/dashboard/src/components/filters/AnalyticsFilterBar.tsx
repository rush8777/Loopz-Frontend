import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@movecues/ui";
import { Checkbox } from "@movecues/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@movecues/ui";
import { Input } from "@movecues/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@movecues/ui";
import { cn } from "@movecues/ui";
import { filterCount, filterLabel, normalizedValues, type AppliedFilters, type FilterDefinition, type FilterValue } from "./filterTypes";

export { type AppliedFilters, type FilterDefinition, type FilterOption, type FilterValue } from "./filterTypes";

interface Props {
  definitions: FilterDefinition[];
  values: AppliedFilters;
  onChange: (filters: AppliedFilters) => void;
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (search: string) => void;
  sort?: string;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (sort: string) => void;
  onOpen?: () => void;
  className?: string;
}

/** Compact shared filter UI. Only committed values flow to the parent/URL; dialog state remains local. */
export function AnalyticsFilterBar({ definitions, values, onChange, search, searchPlaceholder = "Search…", onSearchChange, sort, sortOptions, onSortChange, onOpen, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AppliedFilters>(values);
  useEffect(() => { if (!open) setDraft(values); }, [values, open]);
  const count = filterCount(values);

  function updateDraft(key: string, value: FilterValue) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function remove(key: string) {
    const next = { ...values };
    delete next[key];
    onChange(next);
  }
  function clear() { onChange({}); }

  return <div className={cn("mb-4 space-y-2", className)}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { onOpen?.(); setOpen(true); }}><Filter />Filter{count ? ` ${count}` : ""}</Button>
        {onSearchChange && <Input aria-label={searchPlaceholder} value={search ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="h-8 w-full sm:w-64" />}
      </div>
      {sortOptions && onSortChange && <Select value={sort} onValueChange={onSortChange}><SelectTrigger className="h-8 w-44"><SelectValue placeholder="Sort" /></SelectTrigger><SelectContent>{sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>}
    </div>
    {count > 0 && <div className="flex flex-wrap items-center gap-1.5" aria-label="Applied filters">
      {definitions.filter((definition) => normalizedValues(values[definition.key]).length).map((definition) => <span key={definition.key} className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200/80 bg-blue-50 px-2 text-xs font-medium text-blue-700 shadow-sm shadow-blue-500/5 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300"><span>{filterLabel(definition, values[definition.key])}</span><button type="button" aria-label={`Remove ${definition.label} filter`} className="rounded p-0.5 text-blue-600/70 transition-colors hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300/70 dark:hover:bg-blue-400/20 dark:hover:text-blue-200" onClick={() => remove(definition.key)}><X className="size-3" /></button></span>)}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-400/10 dark:hover:text-blue-200" onClick={clear}>Clear all</Button>
    </div>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0" showClose={false}>
        <DialogHeader className="border-b px-5 py-4"><DialogTitle>Filters</DialogTitle><DialogDescription>Add one or more conditions. Categories combine with AND; selected values combine with OR.</DialogDescription></DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
          {definitions.map((definition) => <FilterCondition key={definition.key} definition={definition} value={draft[definition.key]} onChange={(value) => updateDraft(definition.key, value)} />)}
        </div>
        <DialogFooter className="border-t px-5 py-4"><Button variant="ghost" type="button" onClick={() => setDraft({})}>Reset</Button><span className="flex-1" /><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={() => { onChange(draft); setOpen(false); }}>Apply filters</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function FilterCondition({ definition, value, onChange }: { definition: FilterDefinition; value: FilterValue; onChange: (value: FilterValue) => void }) {
  const selected = normalizedValues(value);
  if (!definition.multiple) return <label className="grid gap-1.5 text-sm font-medium"><span>{definition.label}</span><Select value={selected[0] ?? "all"} onValueChange={(next) => onChange(next === "all" ? undefined : next)}><SelectTrigger><SelectValue placeholder={`Any ${definition.label.toLowerCase()}`} /></SelectTrigger><SelectContent><SelectItem value="all">Any {definition.label.toLowerCase()}</SelectItem>{definition.options.map((option) => <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>;
  return <fieldset className="grid gap-2"><legend className="text-sm font-medium">{definition.label}</legend><div className="flex flex-wrap gap-x-4 gap-y-2">{definition.options.map((option) => { const checked = selected.includes(option.value); return <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={checked} onCheckedChange={(next) => { const values = next ? [...selected, option.value] : selected.filter((item) => item !== option.value); onChange(values.length ? values : undefined); }} />{option.label}</label>; })}</div></fieldset>;
}

import { DATE_RANGE_PRESETS, type DateRangePreset } from "../lib/dateRange";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  preset,
  customSince,
  customUntil,
  onChange,
  compact = false,
  labelOverrides,
}: {
  preset: DateRangePreset;
  customSince?: string;
  customUntil?: string;
  onChange: (preset: DateRangePreset, customSince?: string, customUntil?: string) => void;
  compact?: boolean;
  labelOverrides?: Partial<Record<DateRangePreset, string>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md bg-muted p-0.5">
        {DATE_RANGE_PRESETS.map((p) => (
          <Button
            key={p.value}
            onClick={() => onChange(p.value, customSince, customUntil)}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(compact ? "h-8 px-2.5" : "h-7 px-2.5", "font-normal text-muted-foreground", preset === p.value && "bg-card font-semibold text-foreground shadow-sm hover:bg-card")}
          >
            {labelOverrides?.[p.value] ?? p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="date"
            className={cn("w-[150px]", compact && "h-8")}
            value={customSince?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", e.target.value, customUntil)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className={cn("w-[150px]", compact && "h-8")}
            value={customUntil?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", customSince, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

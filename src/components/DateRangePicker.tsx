import { DATE_RANGE_PRESETS, type DateRangePreset } from "../lib/dateRange";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  preset,
  customSince,
  customUntil,
  onChange,
}: {
  preset: DateRangePreset;
  customSince?: string;
  customUntil?: string;
  onChange: (preset: DateRangePreset, customSince?: string, customUntil?: string) => void;
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
            className={cn("h-7 px-2.5 font-normal text-muted-foreground", preset === p.value && "bg-card font-semibold text-foreground shadow-sm hover:bg-card")}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="date"
            className="w-[150px]"
            value={customSince?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", e.target.value, customUntil)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-[150px]"
            value={customUntil?.slice(0, 10) ?? ""}
            onChange={(e) => onChange("custom", customSince, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

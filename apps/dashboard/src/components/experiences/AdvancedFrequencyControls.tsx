import { useEffect, useState } from "react";
import { Input, Label } from "@movecues/ui";
import type { ExperienceTargeting } from "../../types/experiences";

type Frequency = ExperienceTargeting["frequency"];
type CooldownUnit = "hours" | "days";

const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring/30";

function cooldownDisplay(cooldownHours: number | undefined): { value: string; unit: CooldownUnit } {
  if (!cooldownHours) return { value: "", unit: "hours" };
  return cooldownHours % 24 === 0 ? { value: String(cooldownHours / 24), unit: "days" } : { value: String(cooldownHours), unit: "hours" };
}

export function AdvancedFrequencyControls({ frequency, onChange }: { frequency: Frequency; onChange(next: Frequency): void }) {
  const [cooldown, setCooldown] = useState(() => cooldownDisplay(frequency.cooldownHours));
  useEffect(() => setCooldown(cooldownDisplay(frequency.cooldownHours)), [frequency.cooldownHours]);

  const setCooldownValue = (value: string, unit = cooldown.unit) => {
    setCooldown({ value, unit });
    if (!value) {
      const { cooldownHours: _removed, ...next } = frequency;
      onChange(next);
      return;
    }
    const hours = Number(value) * (unit === "days" ? 24 : 1);
    if (Number.isInteger(hours) && hours >= 1 && hours <= 8760) onChange({ ...frequency, cooldownHours: hours });
  };
  const setMaxImpressions = (value: string) => {
    if (!value) {
      const { maxImpressions: _removed, ...next } = frequency;
      onChange(next);
      return;
    }
    const impressions = Number(value);
    if (Number.isInteger(impressions) && impressions >= 1 && impressions <= 10000) onChange({ ...frequency, maxImpressions: impressions });
  };

  return <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Advanced frequency</summary><div className="mt-4 grid gap-4"><Label>Wait before showing again <span className="font-normal text-muted-foreground">(optional)</span><div className="mt-1 flex gap-2"><Input aria-label="Wait before showing again" className="min-w-0" type="number" min="1" step="1" value={cooldown.value} onChange={(event) => setCooldownValue(event.target.value)} /><select aria-label="Wait before showing again unit" className={selectClass} value={cooldown.unit} onChange={(event) => setCooldownValue(cooldown.value, event.target.value as CooldownUnit)}><option value="hours">Hours</option><option value="days">Days</option></select></div><span className="mt-1 block text-xs leading-5 text-muted-foreground">Don’t show this experience again until this time has passed.</span></Label><Label>Maximum times per user <span className="font-normal text-muted-foreground">(optional)</span><Input aria-label="Maximum times per user" className="mt-1" type="number" min="1" step="1" value={frequency.maxImpressions ?? ""} onChange={(event) => setMaxImpressions(event.target.value)} /><span className="mt-1 block text-xs leading-5 text-muted-foreground">Stop showing this experience after this many impressions.</span></Label></div></details>;
}

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface ResolvedDateRange {
  since: string; // ISO
  until: string; // ISO
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "custom", label: "Custom" },
];

const PRESET_DAYS: Record<Exclude<DateRangePreset, "custom">, number> = { today: 0, "7d": 7, "30d": 30, "90d": 90 };

/** Resolves a preset (or explicit custom since/until) into concrete ISO bounds. Returns null only for "custom" with an incomplete pair - the caller should keep showing the picker rather than querying with a half-open range. */
export function resolveDateRange(preset: DateRangePreset, customSince?: string, customUntil?: string): ResolvedDateRange | null {
  if (preset === "custom") {
    if (!customSince || !customUntil) return null;
    return { since: new Date(customSince).toISOString(), until: new Date(customUntil).toISOString() };
  }
  const until = new Date();
  const since = new Date(until);
  if (preset === "today") since.setHours(0, 0, 0, 0);
  else since.setTime(until.getTime() - PRESET_DAYS[preset] * 24 * 60 * 60 * 1000);
  return { since: since.toISOString(), until: until.toISOString() };
}

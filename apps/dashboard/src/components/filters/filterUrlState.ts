import type { AppliedFilters } from "./filterTypes";

/** URL state intentionally contains only committed filters, never dialog drafts. */
export function readFilters(params: URLSearchParams, keys: string[]): AppliedFilters {
  return Object.fromEntries(keys.flatMap((key) => { const value = params.get(key); return value ? [[key, value.split(",").filter(Boolean)]] : []; }));
}

export function writeFilters(params: URLSearchParams, filters: AppliedFilters, keys: string[]) {
  const next = new URLSearchParams(params);
  for (const key of keys) {
    const value = filters[key];
    const serialized = Array.isArray(value) ? value.filter(Boolean).join(",") : value;
    if (serialized) next.set(key, serialized); else next.delete(key);
  }
  next.delete("offset");
  return next;
}

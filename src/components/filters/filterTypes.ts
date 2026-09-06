export type FilterValue = string | string[] | undefined;

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  options: FilterOption[];
  /** A filter can select several values; those values are sent as a comma-separated OR set. */
  multiple?: boolean;
}

export type AppliedFilters = Record<string, FilterValue>;

export function normalizedValues(value: FilterValue): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export function filterCount(values: AppliedFilters) {
  return Object.values(values).reduce((count, value) => count + (normalizedValues(value).length ? 1 : 0), 0);
}

export function filterLabel(definition: FilterDefinition, value: FilterValue) {
  return normalizedValues(value)
    .map((item) => definition.options.find((option) => option.value === item)?.label ?? item)
    .join(", ");
}

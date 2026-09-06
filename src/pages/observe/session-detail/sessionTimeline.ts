import type { SessionActivity, SessionActivityItem, SessionActivityPageGroup } from "../../../types/api";

export type FilterKind = "click" | "custom" | "long_hover" | "derived_signal";
export type SessionEpisodeViewModel = {
  id: string;
  index: number;
  page: SessionActivityPageGroup;
  title: string;
  displayStartMs: number;
  displayEndMs: number;
  observedLastActivityMs: number;
  visibleItems: SessionActivityItem[];
  allQualifyingItems: SessionActivityItem[];
};

const time = (value: string) => Date.parse(value);

export function elapsedLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}:${String(seconds % 60).padStart(2, "0")}` : `0:${String(seconds).padStart(2, "0")}`;
}

export function visibleItems(items: SessionActivityItem[], filters: Record<FilterKind, boolean>) {
  return items.filter((item) => filters[item.kind]);
}

export function createEpisodes(session: SessionActivity, filters: Record<FilterKind, boolean>): SessionEpisodeViewModel[] {
  const sessionStart = time(session.firstObserved);
  const sessionEnd = Math.max(sessionStart, time(session.lastObserved));
  return session.pages.map((page, index) => {
    const start = Math.min(sessionEnd, Math.max(sessionStart, time(page.firstObserved)));
    const nextStart = session.pages[index + 1] ? time(session.pages[index + 1].firstObserved) : sessionEnd;
    const end = Math.min(sessionEnd, Math.max(start, nextStart));
    return {
      id: page.id,
      index,
      page,
      title: page.pageName ?? page.path ?? "Unknown page",
      displayStartMs: start - sessionStart,
      displayEndMs: end - sessionStart,
      observedLastActivityMs: Math.min(sessionEnd, Math.max(sessionStart, time(page.lastObserved))) - sessionStart,
      visibleItems: visibleItems(page.items, filters),
      allQualifyingItems: page.items,
    };
  });
}

export function activityDensity(session: SessionActivity, filters: Record<FilterKind, boolean>, bucketCount = 28): number[] {
  const buckets = Array.from({ length: Math.max(1, bucketCount) }, () => 0);
  const start = time(session.firstObserved);
  const duration = Math.max(0, time(session.lastObserved) - start);
  for (const item of session.pages.flatMap((page) => visibleItems(page.items, filters))) {
    const elapsed = Math.max(0, Math.min(duration, time(item.timestamp) - start));
    const bucket = duration === 0 ? 0 : Math.min(buckets.length - 1, Math.floor((elapsed / duration) * buckets.length));
    buckets[bucket] += 1;
  }
  return buckets;
}

export function episodeSummary(episode: SessionEpisodeViewModel): string {
  if (episode.visibleItems.length === 0) return episode.allQualifyingItems.length === 0 ? "No notable activity" : "No activity matches the current filters.";
  const counts = episode.visibleItems.reduce<Record<string, number>>((total, item) => ({ ...total, [item.kind]: (total[item.kind] ?? 0) + 1 }), {});
  const labels: [FilterKind, string][] = [["click", "click"], ["custom", "application event"], ["long_hover", "long hover"], ["derived_signal", "derived signal"]];
  return labels.filter(([kind]) => counts[kind]).map(([kind, label]) => `${counts[kind]} ${label}${counts[kind] === 1 ? "" : "s"}`).join(" · ");
}

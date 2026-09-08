import type { SessionActivity, SessionActivityEpisode, SessionActivityItem, SessionActivityPageGroup } from "../../../types/api";

export type FilterKind = "click" | "custom" | "long_hover" | "derived_signal";
export type SessionEpisodeViewModel = {
  id: string;
  index: number;
  page: SessionActivityPageGroup;
  episode: SessionActivityEpisode;
  title: string;
  displayStartMs: number;
  displayEndMs: number;
  observedLastActivityMs: number;
  visibleItems: SessionActivityItem[];
  allQualifyingItems: SessionActivityItem[];
  idleGapBeforeMs?: number;
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
  return session.pages.flatMap((page) => page.episodes.map((episode) => ({ page, episode }))).map(({ page, episode }, index) => {
    const start = Math.min(sessionEnd, Math.max(sessionStart, time(episode.startedAt)));
    const end = Math.min(sessionEnd, Math.max(start, time(episode.endedAt)));
    return {
      id: episode.id,
      index,
      page,
      episode,
      title: `Episode ${index + 1}`,
      displayStartMs: start - sessionStart,
      displayEndMs: end - sessionStart,
      observedLastActivityMs: end - sessionStart,
      visibleItems: visibleItems(episode.items, filters),
      allQualifyingItems: episode.items,
      ...(episode.idleGapBeforeMs != null ? { idleGapBeforeMs: episode.idleGapBeforeMs } : {}),
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

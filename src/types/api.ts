export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Org {
  orgId: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

export interface Site {
  id: string;
  siteId: string;
  name: string;
  domain: string | null;
}

export interface SessionSummary {
  sessionId: string;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  durationMs: number;
  hasReplay: boolean;
  /** Only populated on the tracked-user/anonymous-visitor session lists (routes/tracked-users.ts, routes/anonymous-users.ts) - the generic Observe > Sessions list doesn't resolve these. */
  deviceType?: "desktop" | "mobile" | "tablet" | null;
  browserName?: string | null;
  osName?: string | null;
}

export interface SessionEvent {
  type: "page_view" | "hover" | "click" | "scroll" | "cursor";
  timestamp: string;
  selector: string | null;
  durationMs: number | null;
  scrollPercent: number | null;
  x: number | null;
  y: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

export interface SessionDetail {
  sessionId: string;
  hasReplay: boolean;
  events: SessionEvent[];
}

export interface SnapshotResponse {
  sessionId: string;
  timestamp: string;
  data: {
    node: unknown; // serializedNodeWithId from rrweb-snapshot
    initialOffset: { top: number; left: number };
  };
}

// --- User Profile / User 360 ---

export interface TrackedUserProperty {
  name: string;
  value: unknown;
  valueType: string;
  source: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Automatically-collected environment context from the visitor's most recent session - see EnvironmentContext.ts on the SDK side. Null if they predate session_start (older SDK build) or the session hasn't reported it yet. */
export interface EnvironmentContext {
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | null;
  language: string | null;
  timezone: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  referrer: string | null;
}

export interface TrackedUserSummary {
  id: string;
  identityType: "identified";
  isAnonymous: false;
  externalUserId: string;
  anonymousIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  properties: Record<string, unknown>;
}

export interface TrackedUserStats {
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  sessionCount: number;
  pageViewCount: number;
  eventCount: number;
  totalActiveTimeMs: number;
  firstPage: string | null;
  lastPage: string | null;
}

export interface TrackedUserDetail {
  id: string;
  identityType: "identified";
  isAnonymous: false;
  externalUserId: string;
  anonymousIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  firstIdentifiedAt: string;
  lastIdentifiedAt: string;
  properties: TrackedUserProperty[];
  stats: TrackedUserStats;
  environment: EnvironmentContext | null;
}

export interface UserActivityItem {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  title: string;
  metadata: {
    selector: string | null;
    elementLabel: string | null;
    elementRole: string | null;
    pagePath: string | null;
    durationMs: number | null;
    scrollPercent: number | null;
  };
}

// --- Anonymous visitors (pre-identify() identities) ---

export interface AnonymousVisitorSummary {
  anonymousId: string;
  identityType: "anonymous";
  isAnonymous: true;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  pageViewCount: number;
  eventCount: number;
}

/**
 * `identify()` may have since claimed this anonymousId - in that case
 * the detail endpoint returns a `resolved` variant pointing at the
 * identified profile instead of anonymous stats, rather than pretending
 * it's still a standalone identity.
 */
export type AnonymousVisitorDetail =
  | {
      identityType: "anonymous";
      isAnonymous: true;
      anonymousId: string;
      userId: null;
      properties: Record<string, never>;
      stats: TrackedUserStats;
      environment: EnvironmentContext | null;
    }
  | {
      identityType: "identified";
      isAnonymous: false;
      anonymousId: string;
      resolvedTo: { trackedUserId: string; externalUserId: string };
    };

// --- Pattern Analysis ---

export type PatternStepVerb = "enter" | "hover" | "click" | "scroll_past";

export interface PatternStep {
  id: string;
  verb: PatternStepVerb;
  target?: { selector: string };
  minDurationMs?: number;
  minScrollPercent?: number;
  required?: boolean;
  maxGapMs?: number;
}

export interface PatternFeedback {
  message: string;
  targetSelector: string;
}

export interface Pattern {
  id: string;
  siteId: string;
  name: string;
  origin: "AUTHORED" | "DISCOVERED";
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  matchWindowMs: number;
  steps: PatternStep[];
  feedback: PatternFeedback;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatternMatchLogEntry {
  sessionId: string;
  matchedAt: string;
}

export interface SimilarSessionMatch {
  sessionId: string;
  similarity: number;
  actionTokens: string[];
}

// --- Session clustering (k-means archetypes) ---

export interface SessionCluster {
  clusterId: number;
  sessionCount: number;
  conversionRate: number;
  averages: Record<string, number>;
  sampleSessionIds: string[];
}

export interface ClusterResult {
  totalSessions: number;
  clusters: SessionCluster[];
  note?: string;
}

// --- Pattern Observer (discovered recurring pattern candidates) ---

export interface PatternCandidateQuality {
  frequencyScore: number;
  coverageScore: number;
  consistencyScore: number;
  recencyScore: number;
  overallScore: number;
}

export interface PatternCandidateSimilarityStats {
  average: number;
  minimum: number;
  maximum: number;
}

export interface PatternCandidate {
  id: string;
  representativeSequence: string[];
  occurrenceCount: number;
  uniqueSessionCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  similarity: PatternCandidateSimilarityStats;
  quality: PatternCandidateQuality;
}

export interface ObservationResult {
  sessionCount: number;
  episodeCount: number;
  candidateCount: number;
  candidates: PatternCandidate[];
}

export interface PatternCandidateEpisodeEvidence {
  episodeId: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
  startReason: string;
  endReason: string;
  /** `token` is the canonical grouping/identity string (selector-based); `label` is the SDK-computed friendly name for the same step, when captured. */
  steps: { token: string; label?: string }[];
}

export interface PatternCandidateDetail {
  candidate: PatternCandidate;
  evidence: PatternCandidateEpisodeEvidence[];
}

// --- Pages (URL-rule-based logical pages, Pendo-style) ---

export type PageRuleKind = "include" | "exclude";
export type PageRuleOperator = "equals" | "starts_with" | "ends_with" | "contains" | "matches_pattern";

export interface PageRule {
  id: string;
  kind: PageRuleKind;
  operator: PageRuleOperator;
  value: string;
}

export type PageType =
  | "landing"
  | "marketing"
  | "dashboard"
  | "list"
  | "detail"
  | "settings"
  | "checkout"
  | "authentication"
  | "pricing"
  | "documentation"
  | "other";

export interface PageDefinition {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  area: string | null;
  pageType: PageType | null;
  rules: PageRule[];
  views: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMatchedPath {
  pagePath: string;
  views: number;
  lastSeenAt: string;
}

export interface PageDetail extends PageDefinition {
  matchedPaths: PageMatchedPath[];
}

export interface UntaggedUrl {
  pagePath: string;
  views: number;
  lastSeenAt: string;
}

export interface PagePreviewResult {
  matched: { pagePath: string; views: number }[];
  unmatchedSample: { pagePath: string; views: number }[];
  metrics: { views: number; uniqueVisitors: number; uniqueSessions: number };
}

// --- Element catalog (from the SDK's ElementCrawler) ---

export interface CatalogElement {
  id: string;
  selector: string;
  tagName: string;
  label: string | null;
  role: string | null;
  /** "crawl" (SDK-computed, may be refreshed by later crawls) or "manual" (a human renamed it - never overwritten by a crawl again). */
  source: "crawl" | "manual";
  isIgnored: boolean;
  seenCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type InvitationRole = Exclude<MembershipRole, "OWNER">;

export interface Org {
  orgId: string;
  name: string;
  role: MembershipRole;
}

export interface Site {
  id: string;
  siteId: string;
  name: string;
  domain: string | null;
}

export interface SiteStatus {
  hasReceivedEvents: boolean;
  lastEventAt: string | null;
  siteId: string;
  domain: string | null;
}

export interface TeamMember {
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: InvitationRole;
  status: "pending" | "expired" | "revoked" | "accepted";
  createdAt: string;
  expiresAt: string;
}

export interface InvitationDetail {
  organization: { id: string; name: string };
  email: string;
  role: InvitationRole;
  expiresAt: string;
}

export interface SessionSummary {
  sessionId: string;
  eventCount: number;
  firstSeen: string;
  lastSeen: string;
  durationMs: number;
  hasReplay: boolean;
  /** Present on the generic Observe Sessions endpoint; optional for older/profile-specific consumers. */
  pageVisitCount?: number;
  clickCount?: number;
  customEventCount?: number;
  visitor?: SessionVisitor | null;
  /** Only populated on the tracked-user/anonymous-visitor session lists (routes/tracked-users.ts, routes/anonymous-users.ts) - the generic Observe > Sessions list doesn't resolve these. */
  deviceType?: "desktop" | "mobile" | "tablet" | null;
  browserName?: string | null;
  osName?: string | null;
}

export interface SessionVisitor {
  type: "identified" | "anonymous";
  id: string;
  label: string;
}

export interface SessionEvent {
  id: string;
  type: "page_view" | "hover" | "click" | "scroll" | "cursor" | "custom";
  timestamp: string;
  eventId: string | null;
  pageViewId: string | null;
  pagePath: string | null;
  selector: string | null;
  elementLabel: string | null;
  elementRole: string | null;
  durationMs: number | null;
  scrollPercent: number | null;
  x: number | null;
  y: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  // custom events only (type === "custom") - the developer-defined
  // event's name and whatever JSON-serializable properties were passed
  // to analytics.event(name, properties?). null for every other type.
  name: string | null;
  properties: Record<string, unknown> | null;
}

export interface SessionDetail {
  sessionId: string;
  hasReplay: boolean;
  events: SessionEvent[];
}

export interface SessionActivityEvidence {
  distanceMoved?: number;
  numberOfDirectionChanges?: number;
  sampleCount?: number;
  minDistanceToTarget?: number;
  maxDistanceToTarget?: number;
  durationMs?: number;
  windowMs?: number;
  targetIsClickable?: boolean;
  sourceEventIds?: string[];
  sourceEventCount?: number;
  provenance: "best_effort_time_window";
}

export interface SessionActivityItem {
  id: string;
  kind: "click" | "custom" | "long_hover" | "derived_signal";
  signalKind?: "dwell" | "element_approach" | "element_leave" | "hesitation" | "reversal" | "repeated_attention" | "hover_intent";
  timestamp: string;
  estimatedStartTimestamp?: string;
  element?: { selector?: string; label?: string; role?: string };
  durationMs?: number;
  name?: string;
  properties?: Record<string, unknown>;
  count?: number;
  evidence?: SessionActivityEvidence;
}

export interface SessionActivityPageGroup {
  id: string;
  pageViewId: string | null;
  path: string | null;
  pageName: string | null;
  attribution: "recorded" | "inferred" | "unknown";
  firstObserved: string;
  lastObserved: string;
  deepestScrollPercent: number | null;
  scrollSampleCount: number;
  items: SessionActivityItem[];
  episodes: SessionActivityEpisode[];
  pointerSignalsAvailable: number;
  geometryEvidenceUsable: boolean;
}

export interface SessionActivityEpisode {
  id: string;
  startedAt: string;
  endedAt: string;
  startReason: "session_start" | "page_enter" | "idle_gap";
  endReason: "page_enter" | "idle_gap" | "session_end";
  idleGapBeforeMs?: number;
  pageViewId: string | null;
  pagePath: string | null;
  items: SessionActivityItem[];
}

export interface SessionActivity {
  sessionId: string;
  hasReplay: boolean;
  visitor: SessionVisitor | null;
  firstObserved: string;
  lastObserved: string;
  observedDurationMs: number;
  counts: { pageVisits: number; clicks: number; customEvents: number };
  environment: EnvironmentContext | null;
  pages: SessionActivityPageGroup[];
  coverage: { complete: boolean; rawEventCount: number; cursorSampleCount: number };
  limitations: { observedDuration: string; hover: string; pointer: string };
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
    // custom events only (type === "custom").
    eventName: string | null;
    eventProperties: Record<string, unknown> | null;
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
  heatmapEnabled: boolean;
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

// --- Event Explorer (developer-defined "custom" events) ---

export interface EventDefinitionSummary {
  name: string;
  occurrences: number;
  uniqueUsers: number;
  sessions: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface UsedInPattern {
  id: string;
  name: string;
}

export interface EventSummary {
  name: string;
  occurrences: number;
  uniqueUsers: number;
  sessions: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  usedIn: { patterns: UsedInPattern[] };
}

export interface TimeseriesPoint {
  date: string;
  count: number;
}

export type PropertyValueKind = "string" | "number" | "boolean" | "null" | "array" | "object";

export interface PropertyCategoricalSummary {
  name: string;
  type: "string" | "boolean";
  sampleCount: number;
  values: { value: string; count: number; percent: number }[];
}
export interface PropertyNumericSummary {
  name: string;
  type: "number";
  sampleCount: number;
  min: number;
  median: number;
  max: number;
}
export interface PropertyComplexSummary {
  name: string;
  type: "array" | "object" | "null";
  sampleCount: number;
}
export type PropertySummary = PropertyCategoricalSummary | PropertyNumericSummary | PropertyComplexSummary;

export interface EventOccurrence {
  id: string;
  timestamp: string;
  sessionId: string;
  anonymousId: string | null;
  trackedUserId: string | null;
  externalUserId: string | null;
  pagePath: string | null;
  properties: Record<string, unknown> | null;
}

export interface EventUserSummary {
  identityType: "identified" | "anonymous";
  trackedUserId: string | null;
  externalUserId: string | null;
  anonymousId: string | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface EventSessionSummary {
  sessionId: string;
  anonymousId: string | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface EventPageSummary {
  pagePath: string | null;
  occurrences: number;
}

// --- Segments (audience definitions - task brief "Build Segments V1") ---
// Mirrors src/lib/segments/types.ts in movecues-Backend; V1 has no shared
// types package between the two repos, so this is a deliberate,
// minimal duplication of the same shape (same precedent as
// EventDefinitionSummary/PageRule above).

export type SegmentTimeWindowUnit = "days";

export interface SegmentTimeWindow {
  value: number;
  unit: SegmentTimeWindowUnit;
}

export type SegmentEventOperator = "performed" | "not_performed";

export interface SegmentEventCondition {
  type: "event";
  eventName: string;
  operator: SegmentEventOperator;
  timeWindow?: SegmentTimeWindow;
}

export type SegmentPropertyOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "exists"
  | "not_exists"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal";

export interface SegmentUserPropertyCondition {
  type: "user_property";
  propertyName: string;
  operator: SegmentPropertyOperator;
  value?: string | number | boolean;
}

export type SegmentPageOperator = "visited" | "not_visited";

export interface SegmentPageCondition {
  type: "page";
  pageId: string;
  operator: SegmentPageOperator;
  timeWindow?: SegmentTimeWindow;
}

export type SegmentFunnelCohortDateRange =
  | { type: "relative"; days: number }
  | { type: "today" }
  | { type: "absolute"; since: string; until: string };

export interface SegmentFunnelCohortCondition {
  type: "funnel_cohort";
  funnelId: string;
  stepIndex: number;
  cohort: "reached" | "dropped_after";
  conversionWindowMinutes: number;
  dateRange: SegmentFunnelCohortDateRange;
}

export type SegmentCondition = SegmentEventCondition | SegmentUserPropertyCondition | SegmentPageCondition | SegmentFunnelCohortCondition;

export type SegmentLogic = "and" | "or";

export interface SegmentGroup {
  logic: SegmentLogic;
  conditions: SegmentNode[];
}

export type SegmentNode = SegmentCondition | SegmentGroup;
export type SegmentDefinition = SegmentGroup;

export function isSegmentGroup(node: SegmentNode): node is SegmentGroup {
  return "logic" in node && "conditions" in node;
}

export interface Segment {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  definition: SegmentDefinition;
  audienceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentMember {
  identityType: "identified" | "anonymous";
  trackedUserId: string | null;
  externalUserId: string | null;
  anonymousId: string | null;
  lastSeenAt: string | null;
}


// --- Funnels (ordered step conversion analysis - task brief "Build Funnels V1") ---
// Mirrors src/lib/funnels/types.ts in movecues-Backend; duplicated here for the
// same reason Segment types are (see the note above them).

export type FunnelStepType = "event" | "page";

export interface FunnelEventStep {
  type: "event";
  eventName: string;
  label?: string;
}

export interface FunnelPageStep {
  type: "page";
  pageId: string;
  label?: string;
}

export type FunnelStep = FunnelEventStep | FunnelPageStep;

export interface Funnel {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  steps: FunnelStep[];
  conversionWindowMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelListItem extends Funnel {
  stepCount: number;
  overallConversion: number;
  totalUsers: number;
}

export interface FunnelStepResult {
  index: number;
  type: FunnelStepType;
  label: string;
  eventName?: string;
  pageId?: string;
  users: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
  droppedBeforeNext: number;
}

export interface FunnelTrendPoint {
  date: string;
  startedUsers: number;
  convertedUsers: number;
  conversion: number;
}

export interface FunnelAnalysis {
  steps: FunnelStepResult[];
  totalUsers: number;
  convertedUsers: number;
  overallConversion: number;
  trend: FunnelTrendPoint[];
  since: string;
  until: string;
}

export interface FunnelStepUser {
  identityType: "identified" | "anonymous";
  trackedUserId: string | null;
  externalUserId: string | null;
  anonymousId: string | null;
  lastSeenAt: string | null;
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

export type HeatmapDevice = "desktop" | "tablet" | "mobile";
export type HeatmapLayer = "click" | "hover" | "cursor" | "scroll" | "rage_click";
export interface HeatmapDateRange { from: string; to: string }
export interface HeatmapIndexRow { id: string; name: string; heatmapEnabled: boolean; interactions: number; clicks: number; lastActivityAt: string | null; referenceStatus: "ready" | "needed"; referenceCapturedAt: string | null }

export interface PageHeatmapState {
  id: string;
  name: string;
  selector: string | null;
}

export interface PageHeatmapPoint {
  x?: number;
  y?: number;
  scrollPercent?: number;
  count: number;
}

export interface PageHeatmapResult {
  page: { id: string; name: string };
  stateId: string;
  device: HeatmapDevice;
  layer: HeatmapLayer;
  interactionCount: number;
  points: PageHeatmapPoint[];
  metrics: { visits: number; totalClicks: number; averageTimeMs: number; dropOffRate: number };
  topClickedElements: { selector: string; label: string | null; count: number; percentage: number }[];
  scrollReach: { depth: number; reached: number }[];
  targetUrl: string | null;
  snapshot: null | {
    imageDataUrl: string;
    pagePath: string;
    viewportWidth: number;
    viewportHeight: number;
    documentWidth: number;
    documentHeight: number;
    capturedAt: string;
  };
}

export interface PageElement extends CatalogElement {
  matchedPaths: string[];
}

export type DashboardGranularity = "day" | "week" | "month";
export interface DashboardFilters { since: string; until: string; granularity: DashboardGranularity; segmentId?: string; excludedEventNames: string[] }
export type DashboardCardWidth = "small" | "medium" | "full";
export type DashboardMetricId = "users.unique" | "users.conversion_rate" | "users.stickiness" | "sessions.count" | "sessions.conversion_rate" | "sessions.observed_duration" | "events.occurrences" | "events.per_user" | "events.per_session";
export type DashboardBreakdown =
  | { dimension: "page" | "page_area" | "page_type" | "event" | "identity" | "device" | "browser" | "os" | "language" | "referrer" }
  | { dimension: "segment"; segmentIds: string[] }
  | { dimension: "user_property"; propertyName: string };
export interface MetricCardConfiguration {
  schemaVersion: 1; kind: "metric"; metricId: DashboardMetricId;
  events?: { eventNames: string[]; match: "each" | "any" | "all" };
  conversion?: { numeratorEvent: string; denominatorEvent?: string };
  mode: "trend" | "breakdown" | "single"; breakdown?: DashboardBreakdown;
  visualization: "line" | "bars" | "stacked_bars" | "horizontal_bars" | "table" | "total" | "recent" | "previous_period";
  target?: { value: number; direction: "at_least" | "at_most"; intent: "achieve" | "maintain" };
}
export interface FunnelCardConfiguration { schemaVersion: 1; kind: "funnel"; funnelId: string }
export type RetentionEventReference = { type: "any_meaningful" } | { type: "event"; eventName: string };
export interface RetentionCardConfiguration { schemaVersion: 1; kind: "retention"; startEvent: RetentionEventReference; returnEvent: RetentionEventReference; cohort: { type: "start_date" } | { type: "segments"; segmentIds: string[] }; visualization: "grid" | "trend" }
export interface ExperienceCardConfiguration { schemaVersion: 1; kind: "experience"; experienceType: "guide" | "survey" | "widget" | "checklist"; experienceId: string; metric: "users_seen" | "completions" | "completion_rate" | "dismissals" | "step_reach" | "step_drop_off" | "responses" | "response_rate" | "abandonment_rate" | "impressions" | "interactions" | "interaction_rate"; visualization: "total" | "bars" | "horizontal_bars" | "table" }
export type DashboardCardConfiguration = MetricCardConfiguration | FunnelCardConfiguration | RetentionCardConfiguration | ExperienceCardConfiguration;
export interface DashboardCard { id?: string; title: string; cardType: DashboardCardConfiguration["kind"]; position?: number; width: DashboardCardWidth; configuration: DashboardCardConfiguration; createdAt?: string; updatedAt?: string }
export interface DashboardSummary { id: string; siteId: string; name: string; description: string | null; createdBy: string; cardCount: number; createdAt: string; updatedAt: string }
export interface Dashboard extends Omit<DashboardSummary, "cardCount"> { cards: DashboardCard[] }
export interface AnalyticsMetadata { metricId: string; definition: string; resolvedDateRange: { since: string; until: string }; granularity: DashboardGranularity; appliedFilters: DashboardFilters; breakdown: DashboardBreakdown | null; dataFreshness: string; resultShape: string; timezone: "UTC"; drilldown: string[] }
export type AnalyticsResult =
  | { kind: "timeseries"; series: { key: string; label: string }[]; buckets: { key: string; label: string; incomplete: boolean; values: Record<string, number> }[] }
  | { kind: "breakdown"; rows: { key: string; label: string; value: number }[] }
  | { kind: "scalar"; values: { seriesKey: string; value: number; recentValue: number; previousValue: number | null; deltaPercent: number | null }[] }
  | ({ kind: "funnel" } & FunnelAnalysis)
  | { kind: "retention"; rows: { key: string; label: string; size: number; smallCohort: boolean; currentSegmentComparison: boolean; cells: { offset: number; label: string; retainedUsers: number; percentage: number; incomplete: boolean }[] }[]; trend: { offset: number; label: string; values: Record<string, number> }[] };
export interface AnalyticsResponse { metadata: AnalyticsMetadata; result: AnalyticsResult }
export interface AnalyticsCatalogMetric { id: DashboardMetricId; group: string; label: string; definition: string; matches: ("each" | "any" | "all")[]; breakdowns: string[]; drilldown: string[] }
export interface AnalyticsCatalog { schemaVersion: 1; timezone: "UTC"; metrics: AnalyticsCatalogMetric[]; granularities: DashboardGranularity[]; limits: Record<string, number> }

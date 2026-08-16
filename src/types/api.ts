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

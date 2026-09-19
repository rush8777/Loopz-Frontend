import type { ExperienceDefinition, WidgetBuilderState } from "../../types/experiences";
import { isGuideDefinition } from "../../types/experiences";

const STORAGE_KEY = "movecues:grapes-builder-trace:v1";
const ENABLE_KEY = "movecues:grapes-builder-debug";
const MAX_ENTRIES = 400;
const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface BuilderDebugEntry {
  sequence: number;
  timestamp: string;
  sessionId: string;
  scope: string;
  event: string;
  details?: unknown;
}

interface BuilderDebugApi {
  entries: () => BuilderDebugEntry[];
  export: () => string;
  clear: () => void;
  enable: () => void;
  disable: () => void;
}

declare global {
  interface Window { __MOVECUES_BUILDER_DEBUG__?: BuilderDebugApi }
}

let entries = readEntries();
let sequence = entries.at(-1)?.sequence ?? 0;

export function builderDebug(scope: string, event: string, details?: unknown, level: "debug" | "info" | "warn" | "error" = "debug"): void {
  if (!isEnabled()) return;
  const entry: BuilderDebugEntry = { sequence: ++sequence, timestamp: new Date().toISOString(), sessionId, scope, event, ...(details === undefined ? {} : { details: makeSerializable(details) }) };
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];
  persistEntries();
  const method = level === "debug" ? console.debug : console[level];
  method.call(console, `[Movcues:Grapes #${entry.sequence}] ${scope} · ${event}`, entry.details ?? "");
}

export function summarizeBuilder(builder?: WidgetBuilderState): Record<string, unknown> | null {
  if (!builder) return null;
  const html = builder.html ?? ""; const css = builder.css ?? ""; const project = builder.projectData as { pages?: unknown; styles?: unknown } | undefined;
  const pages = Array.isArray(project?.pages) ? project.pages : [];
  const projectComponents = pages.reduce((total, page) => total + countPageComponents(page), 0);
  return {
    htmlLength: html.length,
    htmlHash: hash(html),
    cssLength: css.length,
    cssHash: hash(css),
    htmlElements: (html.match(/<[a-z][^>]*>/gi) ?? []).length,
    buttons: (html.match(/<button\b/gi) ?? []).length,
    surveyActions: (html.match(/data-movecues-survey-action=/gi) ?? []).length,
    styleRules: (css.match(/\{/g) ?? []).length,
    projectPages: pages.length,
    projectStyles: Array.isArray(project?.styles) ? project.styles.length : null,
    projectComponents,
  };
}

export function summarizeDefinition(definition: ExperienceDefinition): Record<string, unknown> {
  if (isGuideDefinition(definition)) return { kind: "guide", steps: definition.steps.map((step, index) => ({ index, id: step.id, heading: step.content.heading, builder: summarizeBuilder(step.builder) })) };
  if (definition.survey) return { kind: "survey", steps: definition.survey.steps.map((step, index) => ({ index, id: step.id, heading: step.content.heading, builder: summarizeBuilder(step.builder) })) };
  return { kind: "widget", builder: summarizeBuilder(definition.builder) };
}

function isEnabled(): boolean {
  try {
    const setting = window.localStorage.getItem(ENABLE_KEY);
    if (setting === "0") return false;
    if (setting === "1") return true;
    if (new URLSearchParams(window.location.search).get("movecues_builder_debug") === "1") return true;
  } catch { return false; }
  return import.meta.env.DEV && import.meta.env.MODE !== "test";
}

function installApi(): void {
  if (typeof window === "undefined") return;
  window.__MOVECUES_BUILDER_DEBUG__ = {
    entries: () => [...entries],
    export: () => JSON.stringify(entries, null, 2),
    clear: () => { entries = []; sequence = 0; try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be unavailable. */ } },
    enable: () => { window.localStorage.setItem(ENABLE_KEY, "1"); },
    disable: () => { window.localStorage.setItem(ENABLE_KEY, "0"); },
  };
}

function readEntries(): BuilderDebugEntry[] {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : []; } catch { return []; }
}

function persistEntries(): void {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Keep console logging if storage quota/privacy blocks persistence. */ }
}

function countPageComponents(page: unknown): number {
  if (!page || typeof page !== "object") return 0;
  const value = page as { component?: unknown; frames?: unknown };
  if (value.component) return countComponents(value.component);
  return Array.isArray(value.frames) ? value.frames.reduce((total, frame) => total + countComponents(frame && typeof frame === "object" ? (frame as { component?: unknown }).component : null), 0) : 0;
}

function countComponents(component: unknown): number {
  if (!component || typeof component !== "object") return 0;
  const children = (component as { components?: unknown }).components;
  return 1 + (Array.isArray(children) ? children.reduce((total, child) => total + countComponents(child), 0) : 0);
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function makeSerializable(value: unknown): unknown {
  try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
}

installApi();

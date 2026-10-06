import type { Component } from "grapesjs";

export type InspectorKind =
  | "widget"
  | "container"
  | "free-area"
  | "free-item"
  | "heading"
  | "text"
  | "button"
  | "image"
  | "avatar"
  | "video"
  | "embed"
  | "divider"
  | "spacer"
  | "icon"
  | "badge"
  | "list"
  | "generic";

const CONTAINER_CLASSES = new Set([
  "movcues-widget__container",
  "movcues-widget__row",
  "movcues-widget__columns",
  "movcues-widget__column",
  "movcues-widget__message",
  "movcues-widget__actions",
  "movcues-widget__progress",
  "movcues-survey-question",
  "movcues-survey-footer",
  "movcues-survey-options",
  "movcues-survey-controls",
]);

export function getInspectorKind(component?: Component | null, freeItem = false): InspectorKind | null {
  if (!component) return null;
  if (freeItem) return "free-item";
  const classes = component.getClasses?.() ?? [];
  const classSet = new Set(classes);
  const tagName = String(component.get?.("tagName") ?? component.getEl?.()?.tagName ?? "").toLowerCase();
  const type = String(component.get?.("type") ?? "");
  const attributes = component.getAttributes?.() ?? {};
  if (classSet.has("movcues-widget") || type === "movcues-widget-root") return "widget";
  if (classSet.has("movcues-free-area") || type === "movcues-free-area") return "free-area";
  if (classSet.has("movcues-widget__heading") || /^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "button" || classSet.has("movcues-widget__button") || attributes["data-movcues-action-id"] || attributes["data-movcues-survey-action"]) return "button";
  if (classSet.has("movcues-widget__avatar-image") || classSet.has("movcues-widget__avatar")) return "avatar";
  if (tagName === "img" || classSet.has("movcues-widget__image") || type === "image") return "image";
  if (tagName === "video" || classSet.has("movcues-widget__video") || type === "movcues-video") return "video";
  if (tagName === "iframe" || classSet.has("movcues-widget__embed") || classSet.has("movcues-widget__embed-frame") || type === "movcues-embed-frame") return "embed";
  if (tagName === "hr" || classSet.has("movcues-widget__divider")) return "divider";
  if (classSet.has("movcues-widget__spacer")) return "spacer";
  if (classSet.has("movcues-widget__icon")) return "icon";
  if (classSet.has("movcues-widget__badge")) return "badge";
  if (tagName === "ul" || tagName === "ol" || classSet.has("movcues-widget__list")) return "list";
  if (tagName === "p" || classSet.has("movcues-widget__body") || classSet.has("movcues-widget__eyebrow") || attributes["data-movcues-content"]) return "text";
  if (classes.some(name => CONTAINER_CLASSES.has(name))) return "container";
  return "generic";
}

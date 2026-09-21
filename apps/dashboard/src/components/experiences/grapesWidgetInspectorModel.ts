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
  "movecues-widget__container",
  "movecues-widget__row",
  "movecues-widget__columns",
  "movecues-widget__column",
  "movecues-widget__message",
  "movecues-widget__actions",
  "movecues-widget__progress",
  "movecues-survey-question",
  "movecues-survey-footer",
  "movecues-survey-options",
  "movecues-survey-controls",
]);

export function getInspectorKind(component?: Component | null, freeItem = false): InspectorKind | null {
  if (!component) return null;
  if (freeItem) return "free-item";
  const classes = component.getClasses?.() ?? [];
  const classSet = new Set(classes);
  const tagName = String(component.get?.("tagName") ?? component.getEl?.()?.tagName ?? "").toLowerCase();
  const type = String(component.get?.("type") ?? "");
  const attributes = component.getAttributes?.() ?? {};
  if (classSet.has("movecues-widget") || type === "movecues-widget-root") return "widget";
  if (classSet.has("movecues-free-area") || type === "movecues-free-area") return "free-area";
  if (classSet.has("movecues-widget__heading") || /^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "button" || classSet.has("movecues-widget__button") || attributes["data-movecues-action-id"] || attributes["data-movecues-survey-action"]) return "button";
  if (classSet.has("movecues-widget__avatar-image") || classSet.has("movecues-widget__avatar")) return "avatar";
  if (tagName === "img" || classSet.has("movecues-widget__image") || type === "image") return "image";
  if (tagName === "video" || classSet.has("movecues-widget__video") || type === "movecues-video") return "video";
  if (tagName === "iframe" || classSet.has("movecues-widget__embed") || classSet.has("movecues-widget__embed-frame") || type === "movecues-embed-frame") return "embed";
  if (tagName === "hr" || classSet.has("movecues-widget__divider")) return "divider";
  if (classSet.has("movecues-widget__spacer")) return "spacer";
  if (classSet.has("movecues-widget__icon")) return "icon";
  if (classSet.has("movecues-widget__badge")) return "badge";
  if (tagName === "ul" || tagName === "ol" || classSet.has("movecues-widget__list")) return "list";
  if (tagName === "p" || classSet.has("movecues-widget__body") || classSet.has("movecues-widget__eyebrow") || attributes["data-movecues-content"]) return "text";
  if (classes.some(name => CONTAINER_CLASSES.has(name))) return "container";
  return "generic";
}

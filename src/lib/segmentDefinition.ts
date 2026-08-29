import type { SegmentCondition, SegmentGroup, SegmentNode } from "../types/api";

export function newEventCondition(): SegmentCondition {
  return { type: "event", eventName: "", operator: "performed" };
}

export function newPropertyCondition(): SegmentCondition {
  return { type: "user_property", propertyName: "", operator: "equals", value: "" };
}

export function newPageCondition(): SegmentCondition {
  return { type: "page", pageId: "", operator: "visited" };
}

export function defaultConditionForType(type: SegmentCondition["type"]): SegmentCondition {
  switch (type) {
    case "event":
      return newEventCondition();
    case "user_property":
      return newPropertyCondition();
    case "page":
      return newPageCondition();
  }
}

export function emptyGroup(): SegmentGroup {
  return { logic: "and", conditions: [newEventCondition()] };
}

/** True if every leaf condition has the minimum fields filled in - used to gate saving/preview so we never send a half-built condition to the backend. */
export function isDefinitionComplete(node: SegmentNode): boolean {
  if ("logic" in node && "conditions" in node) {
    return node.conditions.length > 0 && node.conditions.every(isDefinitionComplete);
  }
  switch (node.type) {
    case "event":
      return node.eventName.trim().length > 0;
    case "user_property": {
      if (node.propertyName.trim().length === 0) return false;
      if (node.operator === "exists" || node.operator === "not_exists") return true;
      if (node.value === undefined) return false;
      return typeof node.value !== "string" || node.value.trim().length > 0;
    }
    case "page":
      return node.pageId.trim().length > 0;
  }
}

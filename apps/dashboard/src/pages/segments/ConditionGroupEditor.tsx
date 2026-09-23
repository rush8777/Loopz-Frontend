import type {
  PageDefinition,
  SegmentCondition,
  SegmentEventCondition,
  SegmentGroup,
  SegmentNode,
  SegmentPageCondition,
  SegmentPropertyOperator,
  SegmentUserPropertyCondition,
} from "../../types/api";
import { isSegmentGroup } from "../../types/api";
import { defaultConditionForType, emptyGroup, newEventCondition } from "../../lib/segmentDefinition";

const PROPERTY_OPERATOR_LABEL: Record<SegmentPropertyOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  exists: "is set",
  not_exists: "is not set",
  greater_than: "is greater than",
  less_than: "is less than",
  greater_than_or_equal: "is at least",
  less_than_or_equal: "is at most",
};

const VALUE_OPERATORS: SegmentPropertyOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
];

/** The whole nested tree, generated from `group` rather than hard-coded to any fixed number of conditions (task brief section 12). */
export function ConditionGroupEditor({
  group,
  onChange,
  onRemove,
  eventNames,
  pages,
  depth,
}: {
  group: SegmentGroup;
  onChange: (next: SegmentGroup) => void;
  onRemove?: () => void;
  eventNames: string[];
  pages: PageDefinition[];
  depth: number;
}) {
  function updateNode(index: number, next: SegmentNode) {
    const conditions = group.conditions.slice();
    conditions[index] = next;
    onChange({ ...group, conditions });
  }
  function removeNode(index: number) {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: 12,
        background: depth > 0 ? "var(--surface-raised)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <select
          className="input"
          style={{ width: 90, fontWeight: 600 }}
          value={group.logic}
          onChange={(e) => onChange({ ...group, logic: e.target.value as SegmentGroup["logic"] })}
        >
          <option value="and">ALL</option>
          <option value="or">ANY</option>
        </select>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>of these match</span>
        {onRemove && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRemove}>
            Remove group
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.conditions.map((node, i) =>
          isSegmentGroup(node) ? (
            <ConditionGroupEditor
              key={i}
              group={node}
              onChange={(next) => updateNode(i, next)}
              onRemove={() => removeNode(i)}
              eventNames={eventNames}
              pages={pages}
              depth={depth + 1}
            />
          ) : (
            <ConditionEditor
              key={i}
              condition={node}
              onChange={(next) => updateNode(i, next)}
              onRemove={() => removeNode(i)}
              eventNames={eventNames}
              pages={pages}
            />
          )
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ ...group, conditions: [...group.conditions, newEventCondition()] })}
        >
          + Add condition
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...group, conditions: [...group.conditions, emptyGroup()] })}>
          + Add group
        </button>
      </div>
    </div>
  );
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  eventNames,
  pages,
}: {
  condition: SegmentCondition;
  onChange: (next: SegmentCondition) => void;
  onRemove: () => void;
  eventNames: string[];
  pages: PageDefinition[];
}) {
  if (condition.type === "funnel_cohort") {
    return <div className="card card-padded" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span>Funnel cohort: {condition.cohort === "reached" ? "reached" : "dropped after"} step {condition.stepIndex + 1}</span><button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRemove}>Remove</button></div>;
  }
  return (
    <div className="card card-padded" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <select
        className="input"
        style={{ width: 130 }}
        value={condition.type}
        onChange={(e) => onChange(defaultConditionForType(e.target.value as "event" | "user_property" | "page"))}
      >
        <option value="event">Event</option>
        <option value="user_property">User property</option>
        <option value="page">Page</option>
      </select>

      {condition.type === "event" && <EventFields condition={condition} onChange={onChange} eventNames={eventNames} />}
      {condition.type === "user_property" && <PropertyFields condition={condition} onChange={onChange} />}
      {condition.type === "page" && <PageFields condition={condition} onChange={onChange} pages={pages} />}

      <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function TimeWindowField({
  timeWindow,
  onChange,
}: {
  timeWindow: { value: number; unit: "days" } | undefined;
  onChange: (next: { value: number; unit: "days" } | undefined) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
      <input
        type="checkbox"
        checked={Boolean(timeWindow)}
        onChange={(e) => onChange(e.target.checked ? { value: 14, unit: "days" } : undefined)}
      />
      within last
      <input
        className="input"
        type="number"
        min={1}
        max={365}
        style={{ width: 64 }}
        disabled={!timeWindow}
        value={timeWindow?.value ?? 14}
        onChange={(e) => onChange({ value: Number(e.target.value) || 1, unit: "days" })}
      />
      days
    </label>
  );
}

function EventFields({
  condition,
  onChange,
  eventNames,
}: {
  condition: SegmentEventCondition;
  onChange: (next: SegmentEventCondition) => void;
  eventNames: string[];
}) {
  return (
    <>
      <input
        className="input"
        style={{ width: 200 }}
        list="segment-event-names"
        placeholder="event_name"
        value={condition.eventName}
        onChange={(e) => onChange({ ...condition, eventName: e.target.value })}
      />
      <datalist id="segment-event-names">
        {eventNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <select
        className="input"
        style={{ width: 140 }}
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as SegmentEventCondition["operator"] })}
      >
        <option value="performed">performed</option>
        <option value="not_performed">not performed</option>
      </select>
      <TimeWindowField timeWindow={condition.timeWindow} onChange={(tw) => onChange({ ...condition, timeWindow: tw })} />
    </>
  );
}

function PropertyFields({
  condition,
  onChange,
}: {
  condition: SegmentUserPropertyCondition;
  onChange: (next: SegmentUserPropertyCondition) => void;
}) {
  const needsValue = VALUE_OPERATORS.includes(condition.operator);
  return (
    <>
      <input
        className="input"
        style={{ width: 160 }}
        placeholder="property name"
        value={condition.propertyName}
        onChange={(e) => onChange({ ...condition, propertyName: e.target.value })}
      />
      <select
        className="input"
        style={{ width: 160 }}
        value={condition.operator}
        onChange={(e) =>
          onChange({
            ...condition,
            operator: e.target.value as SegmentPropertyOperator,
            value: VALUE_OPERATORS.includes(e.target.value as SegmentPropertyOperator) ? (condition.value ?? "") : undefined,
          })
        }
      >
        {(Object.keys(PROPERTY_OPERATOR_LABEL) as SegmentPropertyOperator[]).map((op) => (
          <option key={op} value={op}>
            {PROPERTY_OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>
      {needsValue && (
        <input
          className="input"
          style={{ width: 160 }}
          placeholder="value"
          value={condition.value === undefined ? "" : String(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            const isNumeric = raw.trim() !== "" && !Number.isNaN(Number(raw)) && (condition.operator === "greater_than" || condition.operator === "less_than" || condition.operator === "greater_than_or_equal" || condition.operator === "less_than_or_equal");
            onChange({ ...condition, value: isNumeric ? Number(raw) : raw });
          }}
        />
      )}
    </>
  );
}

function PageFields({
  condition,
  onChange,
  pages,
}: {
  condition: SegmentPageCondition;
  onChange: (next: SegmentPageCondition) => void;
  pages: PageDefinition[];
}) {
  return (
    <>
      <select className="input" style={{ width: 200 }} value={condition.pageId} onChange={(e) => onChange({ ...condition, pageId: e.target.value })}>
        <option value="">Select a page…</option>
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        style={{ width: 140 }}
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as SegmentPageCondition["operator"] })}
      >
        <option value="visited">visited</option>
        <option value="not_visited">not visited</option>
      </select>
      <TimeWindowField timeWindow={condition.timeWindow} onChange={(tw) => onChange({ ...condition, timeWindow: tw })} />
    </>
  );
}

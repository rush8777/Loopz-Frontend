import { Button, Label } from "@movcues/ui";
import type { Segment } from "@/types/api";
import type { ExperienceTargeting } from "@/types/experiences";

export function AudienceTargeting({
  audience,
  segments,
  onChange,
}: {
  audience: ExperienceTargeting["audience"];
  segments: Segment[];
  onChange: (audience: ExperienceTargeting["audience"]) => void;
}) {
  const rules =
    audience.type === "segment_rules"
      ? audience
      : {
          type: "segment_rules" as const,
          logic: "all" as const,
          conditions: [],
        };
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <Label>
        Who should see this?
        <select
          value={audience.type}
          onChange={(event) =>
            onChange(
              event.target.value === "all"
                ? { type: "all" }
                : event.target.value === "segment"
                  ? { type: "segment", segmentId: segments[0]?.id ?? "" }
                  : rules,
            )
          }
        >
          <option value="all">Everyone</option>
          <option value="segment">A saved Segment</option>
          <option value="segment_rules">Combined Segment rules</option>
        </select>
      </Label>
      {audience.type === "segment" && (
        <Label>
          Segment
          <select
            value={audience.segmentId}
            onChange={(event) =>
              onChange({ type: "segment", segmentId: event.target.value })
            }
          >
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </Label>
      )}
      {audience.type === "segment_rules" && (
        <>
          <Label>
            Match
            <select
              value={audience.logic}
              onChange={(event) =>
                onChange({
                  ...audience,
                  logic: event.target.value as "all" | "any",
                })
              }
            >
              <option value="all">All rules</option>
              <option value="any">Any rule</option>
            </select>
          </Label>
          {audience.conditions.map((condition, index) => (
            <div key={condition.id} className="flex gap-2">
              <select
                aria-label={`Segment rule ${index + 1} operator`}
                value={condition.operator}
                onChange={(event) =>
                  onChange({
                    ...audience,
                    conditions: audience.conditions.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            operator: event.target
                              .value as typeof item.operator,
                          }
                        : item,
                    ),
                  })
                }
              >
                <option value="matches">is in</option>
                <option value="not_matches">is not in</option>
              </select>
              <select
                aria-label={`Segment rule ${index + 1} segment`}
                value={condition.segmentId}
                onChange={(event) =>
                  onChange({
                    ...audience,
                    conditions: audience.conditions.map((item, i) =>
                      i === index
                        ? { ...item, segmentId: event.target.value }
                        : item,
                    ),
                  })
                }
              >
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...audience,
                    conditions: audience.conditions.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={!segments.length || audience.conditions.length >= 20}
            onClick={() =>
              onChange({
                ...audience,
                conditions: [
                  ...audience.conditions,
                  {
                    id: `aud_${crypto.randomUUID()}`,
                    segmentId: segments[0]?.id ?? "",
                    operator: "matches",
                  },
                ],
              })
            }
          >
            Add Segment rule
          </Button>
        </>
      )}
    </div>
  );
}

import { Input, Label, Switch } from "@movcues/ui";
import type { ExperienceBehavior } from "../../types/experiences";

type AnchoredCardBehavior = Pick<
  ExperienceBehavior,
  "placement" | "alignment" | "offset" | "pointer"
>;
export function AnchoredCardBehaviorEditor({
  behavior,
  onChange,
}: {
  behavior: AnchoredCardBehavior;
  onChange: (change: (behavior: AnchoredCardBehavior) => void) => void;
}) {
  return (
    <>
      <Label>
        Placement
        <select
          value={behavior.placement ?? "auto"}
          onChange={(event) =>
            onChange((value) => {
              value.placement = event.target.value as NonNullable<
                ExperienceBehavior["placement"]
              >;
            })
          }
        >
          <option value="auto">Auto</option>
          <option value="top">Top</option>
          <option value="right">Right</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
        </select>
      </Label>
      <Label>
        Alignment
        <select
          value={behavior.alignment ?? "center"}
          onChange={(event) =>
            onChange((value) => {
              value.alignment = event.target.value as NonNullable<
                ExperienceBehavior["alignment"]
              >;
            })
          }
        >
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
        </select>
      </Label>
      <Label>
        Distance from target
        <Input
          type="number"
          min="0"
          max="100"
          value={behavior.offset ?? 8}
          onChange={(event) =>
            onChange((value) => {
              value.offset = Math.max(
                0,
                Math.min(100, Number(event.target.value)),
              );
            })
          }
        />
      </Label>
      <label className="flex gap-2">
        <Switch
          checked={behavior.pointer?.enabled ?? true}
          onCheckedChange={(checked) =>
            onChange((value) => {
              value.pointer = { ...value.pointer, enabled: checked };
            })
          }
        />
        Show pointer
      </label>
      <Label>
        Pointer size
        <Input
          type="number"
          min="4"
          max="30"
          value={behavior.pointer?.size ?? 10}
          disabled={behavior.pointer?.enabled === false}
          onChange={(event) =>
            onChange((value) => {
              value.pointer = {
                ...value.pointer,
                size: Math.max(4, Math.min(30, Number(event.target.value))),
              };
            })
          }
        />
      </Label>
    </>
  );
}

type BackdropBehavior = Pick<
  ExperienceBehavior,
  "backdrop" | "backdropOpacity" | "closeOnBackdrop"
>;
export function BackdropBehaviorEditor({
  behavior,
  onChange,
  defaultEnabled = false,
  defaultOpacity = 0.45,
}: {
  behavior: BackdropBehavior;
  onChange: (change: (behavior: BackdropBehavior) => void) => void;
  defaultEnabled?: boolean;
  defaultOpacity?: number;
}) {
  const enabled = behavior.backdrop ?? defaultEnabled;
  return (
    <>
      <label className="flex gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange((value) => {
              value.backdrop = checked;
            })
          }
        />
        Backdrop
      </label>
      {enabled && (
        <>
          <Label>
            Backdrop opacity
            <Input
              type="number"
              min="0"
              max="0.9"
              step="0.05"
              value={behavior.backdropOpacity ?? defaultOpacity}
              onChange={(event) =>
                onChange((value) => {
                  value.backdropOpacity = Number(event.target.value);
                })
              }
            />
          </Label>
          <label className="flex gap-2">
            <Switch
              checked={behavior.closeOnBackdrop ?? false}
              onCheckedChange={(checked) =>
                onChange((value) => {
                  value.closeOnBackdrop = checked;
                })
              }
            />
            Dismiss when backdrop is clicked
          </label>
        </>
      )}
    </>
  );
}

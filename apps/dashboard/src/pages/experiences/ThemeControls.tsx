import { useState } from "react";
import { Button, Input, Label } from "@movcues/ui";
import { colorPickerValue, themeComponentNames } from "../../components/settings/ThemesSettings";
import type { SiteThemeTokens, ThemeComponent, ThemeComponentStyle, ThemeControl, ThemeControlStyle, ThemeShadow } from "../../types/themes";

export const controlNames: Record<ThemeControl, string> = {
  primaryButton: "Primary button", secondaryButton: "Secondary button", input: "Inputs and textareas",
  selection: "Selection and rating", progress: "Progress", closeButton: "Close button",
  checklistItem: "Checklist item", navigation: "Navigation controls",
};

export const labelFor = (key: string) => {
  const separated = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return separated[0].toUpperCase() + separated.slice(1);
};
const selectClass = "w-full rounded-md border bg-background px-2.5 py-2 text-sm";

function NumberControl({ name, value, inherited, min, max, step = 1, update }: {
  name: string; value: number | undefined; inherited?: number; min: number; max: number; step?: number;
  update: (value: number | undefined) => void;
}) {
  return <div className="space-y-1">
    <Label className="grid gap-1.5">{name}
      <Input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""}
        placeholder={inherited === undefined ? "Inherited" : String(inherited)}
        onChange={event => {
          const input = event.target;
          if (input.value === "") update(undefined);
          else update(input.valueAsNumber);
        }}/>
    </Label>
    {inherited !== undefined && (value === undefined
      ? <span className="text-[11px] text-muted-foreground">Inherited</span>
      : <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => update(undefined)}>Reset {name.toLowerCase()}</button>)}
  </div>;
}

function ColorControl({ name, value, inherited, update }: {
  name: string; value: string | undefined; inherited?: string; update: (value: string | undefined) => void;
}) {
  return <div className="space-y-1">
    <Label className="grid gap-1.5">{name}<span className="flex gap-2">
      <input aria-label={`${name} color picker`} type="color" className="size-9 shrink-0 cursor-pointer rounded-md border bg-background p-1"
        value={colorPickerValue(value ?? inherited ?? "")} onChange={event => update(event.target.value)}/>
      <Input aria-label={name} className="min-w-0 font-mono text-xs" value={value ?? ""} placeholder={inherited} onChange={event => update(event.target.value || undefined)}/>
    </span></Label>
    {inherited !== undefined && (value === undefined
      ? <span className="text-[11px] text-muted-foreground">Inherited</span>
      : <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => update(undefined)}>Reset {name.toLowerCase()}</button>)}
  </div>;
}

function ShadowFields({ value, update }: { value: ThemeShadow; update: (value: ThemeShadow) => void }) {
  return <div className="space-y-2">
    <ColorControl name="Shadow color" value={value.color} update={color => update({ ...value, color: color ?? "" })}/>
    <div className="grid grid-cols-2 gap-2">{(["x", "y", "blur", "spread"] as const).map(key =>
      <NumberControl key={key} name={labelFor(key)} value={value[key]} min={key === "blur" ? 0 : -100} max={key === "blur" ? 200 : 100}
        update={number => update({ ...value, [key]: number ?? 0 })}/>)}</div>
  </div>;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <details className="border-t">
    <summary className="cursor-pointer px-4 py-3 text-sm font-medium marker:text-muted-foreground">{label}</summary>
    <div className="space-y-3 px-4 pb-4">{children}</div>
  </details>;
}

const experienceNumbers: Array<{ key: keyof Pick<ThemeComponentStyle, "spacing" | "radius" | "buttonRadius" | "width" | "headingFontSize" | "bodyFontSize" | "headingLineHeight" | "bodyLineHeight">;
  name: string; min: number; max: number; step?: number }> = [
  { key: "headingFontSize", name: "Heading size", min: 10, max: 160 },
  { key: "bodyFontSize", name: "Body size", min: 8, max: 72 },
  { key: "headingLineHeight", name: "Heading line height", min: .8, max: 3, step: .05 },
  { key: "bodyLineHeight", name: "Body line height", min: .8, max: 3, step: .05 },
  { key: "spacing", name: "Surface padding", min: 0, max: 64 },
  { key: "radius", name: "Surface radius", min: 0, max: 100 },
  { key: "buttonRadius", name: "Button radius", min: 0, max: 100 },
  { key: "width", name: "Default width", min: 200, max: 960 },
];
const defaultWidths: Record<ThemeComponent, number> = {
  geo_agent: 368,
  modal: 600, survey: 700, anchored_card: 320, guide: 320, checklist: 360,
  slideout: 400, banner: 960, toast: 380, hotspot: 300, cursor_follow: 280,
};

function removeEmpty<T extends object>(value: T): T | undefined {
  return Object.values(value).some(field => field !== undefined) ? value : undefined;
}

export function ThemeControls({ tokens, onChange, focus }: {
  tokens: SiteThemeTokens; onChange: (tokens: SiteThemeTokens) => void; focus: ThemeComponent | null;
}) {
  const [component, setComponent] = useState<ThemeComponent>("modal");
  const [control, setControl] = useState<ThemeControl>("primaryButton");
  const selected = focus ?? component;
  const style = tokens.components?.[selected] ?? {};
  const shared = tokens.shared?.[control] ?? {};
  function changeComponent<K extends keyof ThemeComponentStyle>(key: K, value: ThemeComponentStyle[K]) {
    onChange({ ...tokens, version: 2, components: { ...tokens.components, [selected]: removeEmpty({ ...style, [key]: value }) } });
  }
  function changeControl<K extends keyof ThemeControlStyle>(key: K, value: ThemeControlStyle[K]) {
    onChange({ ...tokens, version: 2, shared: { ...tokens.shared, [control]: removeEmpty({ ...shared, [key]: value }) } });
  }
  const inheritedNumbers = { ...tokens.typography, spacing: tokens.spacing ?? 0, radius: tokens.radii.lg,
    buttonRadius: tokens.shared?.primaryButton?.radius ?? tokens.radii.md, width: tokens.width ?? defaultWidths[selected] };
  return <section aria-label="Design controls">
    <Group label="Experience styles">
      <Label className="grid gap-1.5">Experience type
        <select className={selectClass} value={selected} disabled={Boolean(focus)} onChange={event => setComponent(event.target.value as ThemeComponent)}>
          {Object.entries(themeComponentNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select>
      </Label>
      <div className="grid grid-cols-2 gap-2.5">{experienceNumbers.filter(item => selected !== "banner" || item.key !== "width").map(item =>
        <NumberControl {...item} key={item.key} value={style[item.key]} inherited={inheritedNumbers[item.key]} update={value => changeComponent(item.key, value)}/>)}</div>
      {(["background", "surface", "text"] as const).map(key => <ColorControl key={key} name={labelFor(key)} value={style[key]} inherited={tokens.colors[key]} update={value => changeComponent(key, value)}/>)}
      <details className="text-sm"><summary className="cursor-pointer">Surface shadow</summary>
        <div className="space-y-2 pt-2"><ShadowFields value={style.shadow ?? tokens.shadows.md} update={value => changeComponent("shadow", value)}/>
          {style.shadow
            ? <Button size="sm" variant="ghost" onClick={() => changeComponent("shadow", undefined)}>Reset shadow</Button>
            : <span className="text-xs text-muted-foreground">Inherited</span>}
        </div>
      </details>
      <Button size="sm" variant="outline" disabled={!tokens.components?.[selected]}
        onClick={() => onChange({ ...tokens, components: { ...tokens.components, [selected]: undefined } })}>Reset experience to foundation</Button>
    </Group>
    <Group label="Colors">
      {(Object.keys(tokens.colors) as Array<keyof SiteThemeTokens["colors"]>).map(key =>
        <ColorControl key={key} name={labelFor(key)} value={tokens.colors[key]} update={value => onChange({ ...tokens, colors: { ...tokens.colors, [key]: value ?? "" } })}/>)}
      <ColorControl name="Focus ring" value={tokens.focusColor} inherited={tokens.colors.primary}
        update={value => onChange({ ...tokens, version: 2, focusColor: value })}/>
    </Group>
    <Group label="Typography">
      {(["bodyFontFamily", "headingFontFamily"] as const).map(key => <Label key={key} className="grid gap-1.5">{labelFor(key)}
        <Input value={tokens.typography[key]} onChange={event => onChange({ ...tokens, typography: { ...tokens.typography, [key]: event.target.value } })}/>
      </Label>)}
      <div className="grid grid-cols-2 gap-2.5">
        {(["bodyFontSize", "headingFontSize", "bodyFontWeight", "headingFontWeight", "bodyLineHeight", "headingLineHeight"] as const).map(key => {
          const lineHeight = key.endsWith("Height");
          const weight = key.endsWith("Weight");
          return <NumberControl key={key} name={labelFor(key)} value={tokens.typography[key]}
            min={lineHeight ? .8 : weight ? 100 : 8} max={lineHeight ? 3 : weight ? 900 : key === "bodyFontSize" ? 72 : 160}
            step={lineHeight ? .05 : 1} update={value => onChange({ ...tokens, typography: { ...tokens.typography, [key]: value ?? 0 } })}/>;
        })}
      </div>
    </Group>
    <Group label="Spacing and corners">
      <div className="grid grid-cols-2 gap-2.5">
        <NumberControl name="Default padding" value={tokens.spacing} min={0} max={64} update={value => onChange({ ...tokens, spacing: value })}/>
        {(["sm", "md", "lg"] as const).map((size, index) => <NumberControl key={size} name={["Small radius", "Control radius", "Surface radius"][index]}
          value={tokens.radii[size]} min={0} max={100} update={value => onChange({ ...tokens, radii: { ...tokens.radii, [size]: value ?? 0 } })}/>)}
      </div>
    </Group>
    <Group label="Shadows and motion">
      <Label className="grid gap-1.5">Motion
        <select className={selectClass} value={tokens.motion ?? "system"} onChange={event => onChange({ ...tokens, version: 2, motion: event.target.value === "off" ? "off" : "system" })}>
          <option value="system">Follow visitor preference</option><option value="off">Disable theme animations</option>
        </select>
      </Label>
      {(["sm", "md"] as const).map(key => <details key={key} className="text-sm"><summary className="cursor-pointer">{key === "sm" ? "Small shadow" : "Surface shadow"}</summary>
        <div className="pt-2"><ShadowFields value={tokens.shadows[key]} update={value => onChange({ ...tokens, shadows: { ...tokens.shadows, [key]: value } })}/></div>
      </details>)}
    </Group>
    <Group label="Shared controls">
      <Label className="grid gap-1.5">Control
        <select className={selectClass} value={control} onChange={event => setControl(event.target.value as ThemeControl)}>
          {Object.entries(controlNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
        </select>
      </Label>
      <div className="grid grid-cols-2 gap-2.5">
        <NumberControl name="Radius" value={shared.radius} inherited={tokens.radii.md} min={0} max={100} update={value => changeControl("radius", value)}/>
        <NumberControl name={control === "progress" ? "Height" : "Minimum height"} value={shared.minHeight}
          inherited={control === "progress" ? 4 : control === "closeButton" ? 24 : 36} min={0} max={72} update={value => changeControl("minHeight", value)}/>
      </div>
      <ColorControl name="Background" value={shared.background} inherited={control === "primaryButton" ? tokens.colors.primary : tokens.colors.surface}
        update={value => changeControl("background", value)}/>
      <ColorControl name="Foreground" value={shared.foreground} inherited={control === "primaryButton" ? tokens.colors.primaryForeground : tokens.colors.text}
        update={value => changeControl("foreground", value)}/>
      <Button size="sm" variant="outline" disabled={!tokens.shared?.[control]}
        onClick={() => onChange({ ...tokens, shared: { ...tokens.shared, [control]: undefined } })}>Reset control</Button>
    </Group>
  </section>;
}

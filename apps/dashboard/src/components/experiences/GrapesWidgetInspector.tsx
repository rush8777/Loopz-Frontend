import { useState, type ReactNode, type RefObject } from "react";
import type { Component, Editor } from "grapesjs";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Circle,
  Minus,
  Plus,
} from "lucide-react";
import { Button, Input, Label } from "@movecues/ui";
import { getInspectorKind, type InspectorKind } from "./grapesWidgetInspectorModel";

export type InspectorStylePatch = Record<string, string | null>;

export interface InspectorStyleSnapshot {
  authored: Record<string, string>;
  effective: Record<string, string>;
}

interface InspectorProps {
  editor: Editor | null;
  component: Component | null;
  isFreeItem: boolean;
  styleRevision: number;
  readStyle: (component: Component) => InspectorStyleSnapshot;
  onStyleChange: (component: Component, patch: InspectorStylePatch) => void;
  onSelect: (component: Component) => void;
  traitsRef: RefObject<HTMLDivElement | null>;
  stylesRef: RefObject<HTMLDivElement | null>;
  widgetSize: ReactNode;
  freePosition: ReactNode;
  interaction: ReactNode;
}

const FONT_PRESETS = {
  sans: "ui-sans-serif,system-ui,sans-serif",
  serif: "ui-serif,Georgia,serif",
  monospace: "ui-monospace,SFMono-Regular,Consolas,monospace",
} as const;

const CORNER_PRESETS = { square: "0", soft: "8px", round: "999px" } as const;
const BORDER_PRESETS = { none: "none", thin: "1px solid rgba(15,23,42,.15)" } as const;
const SHADOW_PRESETS = {
  none: "none",
  soft: "0 4px 12px rgba(15,23,42,.12)",
  medium: "0 12px 28px rgba(15,23,42,.16)",
  strong: "0 20px 48px rgba(15,23,42,.22)",
} as const;

function componentLabel(component: Component, kind: InspectorKind): string {
  const classes = component.getClasses?.() ?? [];
  if (classes.includes("movecues-widget__row")) return "Row";
  if (classes.includes("movecues-widget__columns")) return "Columns";
  if (classes.includes("movecues-widget__column")) return "Column";
  if (classes.includes("movecues-widget__actions")) return "Actions";
  if (classes.includes("movecues-widget__message")) return "Message";
  if (classes.includes("movecues-survey-question")) return "Question";
  const labels: Record<InspectorKind, string> = {
    widget: "Widget",
    container: "Container",
    "free-area": "Free Area",
    "free-item": "Free item",
    heading: "Heading",
    text: "Text",
    button: "Button",
    image: "Image",
    avatar: "Avatar",
    video: "Video",
    embed: "Embed",
    divider: "Divider",
    spacer: "Spacer",
    icon: "Icon",
    badge: "Badge",
    list: "List",
    generic: "Element",
  };
  if (kind !== "generic") return labels[kind];
  const tagName = String(component.get?.("tagName") ?? "").toLowerCase();
  return tagName ? tagName[0].toUpperCase() + tagName.slice(1) : labels.generic;
}

function breadcrumbs(component: Component, isSelectedFreeItem: boolean): Array<{ component: Component; label: string }> {
  const chain: Component[] = [];
  const seen = new Set<Component>();
  let current: Component | undefined | null = component;
  while (current && !seen.has(current)) {
    seen.add(current);
    const type = String(current.get?.("type") ?? "");
    const kind = getInspectorKind(current, current === component && isSelectedFreeItem);
    if (kind && type !== "wrapper" && type !== "canvas") chain.unshift(current);
    current = current.parent?.();
  }
  const result: Array<{ component: Component; label: string }> = [];
  for (const item of chain) {
    const itemKind = getInspectorKind(item, item === component && isSelectedFreeItem) ?? "generic";
    const visualKind = itemKind === "free-item" ? getInspectorKind(item, false) ?? "generic" : itemKind;
    const label = componentLabel(item, visualKind);
    if (result.at(-1)?.label === label) result[result.length - 1] = { component: item, label };
    else result.push({ component: item, label });
  }
  return result;
}

export function GrapesWidgetInspector({ editor, component, isFreeItem, styleRevision: _styleRevision, readStyle, onStyleChange, onSelect, traitsRef, stylesRef, widgetSize, freePosition, interaction }: InspectorProps) {
  const [paddingExpanded, setPaddingExpanded] = useState(false);
  const kind = getInspectorKind(component, isFreeItem);
  const visualKind = component && kind === "free-item" ? getInspectorKind(component, false) ?? "generic" : kind;
  const style = component ? readStyle(component) : { authored: {}, effective: {} };
  const trail = component ? breadcrumbs(component, isFreeItem) : [];
  const traits = component?.getTraits?.();
  const hasTraits = Boolean(traits && traits.length > 0);
  const write = (patch: InspectorStylePatch) => component && onStyleChange(component, patch);
  const isContainer = kind === "widget" || kind === "container";
  const showTypography = visualKind === "heading" || visualKind === "text" || visualKind === "button" || visualKind === "badge" || visualKind === "icon" || visualKind === "list";
  const showNormalLayout = kind !== "free-item" && kind !== "free-area";
  const showWidth = showNormalLayout && kind !== "widget" && visualKind !== "divider";
  const showHeight = showNormalLayout && (visualKind === "container" || visualKind === "image" || visualKind === "avatar" || visualKind === "video" || visualKind === "embed" || visualKind === "spacer");
  const showBlockAlignment = showWidth && visualKind !== "container";
  const showPadding = kind !== "free-item" && kind !== "free-area" && visualKind !== "divider" && visualKind !== "spacer";
  const showObjectFit = visualKind === "image" || visualKind === "avatar" || visualKind === "video";
  const showBackground = visualKind === "widget" || visualKind === "container" || visualKind === "button" || visualKind === "badge" || visualKind === "icon" || visualKind === "image" || visualKind === "avatar" || visualKind === "video" || visualKind === "embed" || kind === "free-area" || visualKind === "generic";
  const showCorners = visualKind !== "text" && visualKind !== "heading" && visualKind !== "list" && visualKind !== "divider" && visualKind !== "spacer";
  const showBorder = showCorners;
  const showShadow = visualKind === "widget" || visualKind === "container" || visualKind === "button" || visualKind === "image" || visualKind === "avatar" || visualKind === "video" || visualKind === "embed" || visualKind === "generic";
  const showAppearance = showBackground || showCorners || showBorder || showShadow;

  return <div className="movecues-inspector" data-inspector-kind={kind ?? "none"}>
    {component ? <>
      <nav className="movecues-inspector__breadcrumb" aria-label="Component hierarchy">
        {trail.map((entry, index) => <span key={`${entry.label}-${index}`}><button type="button" onClick={() => onSelect(entry.component)} aria-current={entry.component === component ? "page" : undefined}>{entry.label}</button>{index < trail.length - 1 && <span aria-hidden="true">›</span>}</span>)}
      </nav>
      <h2 className="movecues-inspector__title">{componentLabel(component, visualKind ?? "generic")}</h2>
    </> : <p className="movecues-inspector__empty">Select an element in the canvas to edit its properties.</p>}

    <section className={hasTraits ? "movecues-inspector__section" : "movecues-inspector__manager--hidden"} aria-hidden={!hasTraits}>
      {hasTraits && <h3>Content</h3>}
      <div ref={traitsRef} />
    </section>

    {component && showTypography && <InspectorSection title="Typography">
      <TypographyControls style={style} write={write} />
    </InspectorSection>}

    {component && (isContainer || showWidth || showHeight || showBlockAlignment || showObjectFit) && <InspectorSection title="Layout">
      {isContainer && <>
        <DirectionControl style={style} write={write} />
        <ContentPositionControl style={style} write={write} />
        <GapControl style={style} write={write} />
      </>}
      {showWidth && <WidthControl kind={visualKind ?? "generic"} style={style} write={write} />}
      {showHeight && <HeightControl style={style} write={write} />}
      {showBlockAlignment && <BlockAlignmentControl style={style} write={write} />}
      {showObjectFit && <SegmentedControl label="Fit" value={matchValue(styleValue(style, "object-fit"), ["contain", "cover", "fill"])} options={[{ value: "contain", label: "Contain" }, { value: "cover", label: "Cover" }, { value: "fill", label: "Fill" }]} onChange={value => write({ "object-fit": value })} />}
    </InspectorSection>}

    {kind === "widget" && widgetSize}
    {freePosition}

    {component && showPadding && <InspectorSection title="Spacing">
      <PaddingControl style={style} write={write} expanded={paddingExpanded} onExpandedChange={setPaddingExpanded} />
    </InspectorSection>}

    {component && showAppearance && <InspectorSection title="Appearance">
      <AppearanceControls style={style} write={write} background={showBackground} corners={showCorners} border={showBorder} shadow={showShadow} />
    </InspectorSection>}

    {interaction}

    <details className="movecues-inspector__advanced">
      <summary>Advanced styles</summary>
      <div ref={stylesRef} />
    </details>
    {!editor && <span className="sr-only">Editor unavailable</span>}
  </div>;
}

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="movecues-inspector__section"><h3>{title}</h3><div className="movecues-inspector__controls">{children}</div></section>;
}

function SegmentedControl({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div className="movecues-inspector__field"><span className="movecues-inspector__label">{label}</span><div className="movecues-inspector__segments" role="group" aria-label={label}>{options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div></div>;
}

function DirectionControl({ style, write }: ControlProps) {
  const direction = styleValue(style, "flex-direction") === "row" ? "row" : "column";
  return <SegmentedControl label="Direction" value={direction} options={[{ value: "column", label: "Vertical" }, { value: "row", label: "Horizontal" }]} onChange={value => write({ display: "flex", "flex-direction": value })} />;
}

const POSITION_OPTIONS = [
  ["top-left", ArrowUpLeft], ["top-center", ArrowUp], ["top-right", ArrowUpRight],
  ["middle-left", ArrowLeft], ["center", Circle], ["middle-right", ArrowRight],
  ["bottom-left", ArrowDownLeft], ["bottom-center", ArrowDown], ["bottom-right", ArrowDownRight],
] as const;

function ContentPositionControl({ style, write }: ControlProps) {
  const direction = styleValue(style, "flex-direction") === "row" ? "row" : "column";
  const justify = normalizeFlexAlignment(styleValue(style, "justify-content"));
  const align = normalizeFlexAlignment(styleValue(style, "align-items"));
  const horizontal = direction === "row" ? justify : align;
  const vertical = direction === "row" ? align : justify;
  const horizontalName = horizontal === "center" ? "center" : horizontal === "flex-end" ? "right" : "left";
  const verticalName = vertical === "center" ? "middle" : vertical === "flex-end" ? "bottom" : "top";
  const selected = verticalName === "middle" && horizontalName === "center" ? "center" : `${verticalName}-${horizontalName}`;
  const choose = (position: string) => {
    const [verticalPart, horizontalPart] = position === "center" ? ["middle", "center"] : position.split("-");
    const horizontalValue = horizontalPart === "center" ? "center" : horizontalPart === "right" ? "flex-end" : "flex-start";
    const verticalValue = verticalPart === "middle" ? "center" : verticalPart === "bottom" ? "flex-end" : "flex-start";
    write({ display: "flex", "justify-content": direction === "row" ? horizontalValue : verticalValue, "align-items": direction === "row" ? verticalValue : horizontalValue });
  };
  return <div className="movecues-inspector__field"><span className="movecues-inspector__label">Content position</span><div className="movecues-inspector__alignment-grid" role="group" aria-label="Content position">{POSITION_OPTIONS.map(([position, Icon]) => <button key={position} type="button" aria-label={`Content position ${position.replace("-", " ")}`} aria-pressed={selected === position} onClick={() => choose(position)}><Icon /></button>)}</div></div>;
}

function GapControl({ style, write }: ControlProps) {
  const value = Math.max(0, numericValue(styleValue(style, "gap"), 0));
  const update = (next: number) => write({ gap: `${Math.max(0, next)}px` });
  return <div className="movecues-inspector__field"><span className="movecues-inspector__label">Space between items</span><div className="movecues-inspector__stepper"><Button type="button" size="icon" variant="outline" aria-label="Decrease gap" onClick={() => update(value - 1)}><Minus /></Button><Input aria-label="Space between items" type="number" min={0} value={value} onChange={event => update(Number(event.target.value))} /><span>px</span><Button type="button" size="icon" variant="outline" aria-label="Increase gap" onClick={() => update(value + 1)}><Plus /></Button></div></div>;
}

function WidthControl({ kind, style, write }: ControlProps & { kind: InspectorKind }) {
  const declared = style.authored.width?.trim() ?? "";
  const defaultMode = ["button", "badge", "icon", "avatar"].includes(kind) ? "hug" : "fill";
  const mode = declared === "fit-content" ? "hug" : declared === "100%" ? "fill" : /^\d+(?:\.\d+)?px$/.test(declared) ? "fixed" : declared ? "custom" : defaultMode;
  const fixed = Math.max(1, numericValue(declared, numericValue(styleValue(style, "width"), 320)));
  const choose = (next: string) => write({ width: next === "hug" ? "fit-content" : next === "fill" ? "100%" : `${Math.round(fixed)}px` });
  return <div className="movecues-inspector__field"><SegmentedControl label="Width" value={mode} options={[{ value: "hug", label: "Hug" }, { value: "fill", label: "Fill" }, { value: "fixed", label: "Fixed" }]} onChange={choose} />{mode === "fixed" && <UnitInput label="Fixed width" value={fixed} min={1} onChange={value => write({ width: `${value}px` })} />}{mode === "custom" && <span className="movecues-inspector__custom">Custom width — edit in Advanced</span>}</div>;
}

function HeightControl({ style, write }: ControlProps) {
  const declared = style.authored.height?.trim() ?? "";
  const fixed = /^\d+(?:\.\d+)?px$/.test(declared);
  const value = Math.max(1, numericValue(declared, numericValue(styleValue(style, "height"), 120)));
  return <div className="movecues-inspector__field"><SegmentedControl label="Height" value={fixed ? "fixed" : "auto"} options={[{ value: "auto", label: "Auto" }, { value: "fixed", label: "Fixed" }]} onChange={mode => write({ height: mode === "auto" ? null : `${Math.round(value)}px` })} />{fixed && <UnitInput label="Fixed height" value={value} min={1} onChange={next => write({ height: `${next}px` })} />}</div>;
}

function BlockAlignmentControl({ style, write }: ControlProps) {
  const width = style.authored.width?.trim();
  const left = style.authored["margin-left"]?.trim();
  const right = style.authored["margin-right"]?.trim();
  const value = width === "100%" && left === "0" && right === "0" ? "fill" : left === "auto" && right === "auto" ? "center" : left === "auto" && right === "0" ? "right" : left === "0" && right === "auto" ? "left" : "custom";
  const choose = (next: string) => {
    if (next === "fill") write({ width: "100%", "margin-left": "0", "margin-right": "0" });
    else write({ "margin-left": next === "right" || next === "center" ? "auto" : "0", "margin-right": next === "left" || next === "center" ? "auto" : "0" });
  };
  return <SegmentedControl label="Block alignment" value={value} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }, { value: "fill", label: "Fill" }]} onChange={choose} />;
}

function PaddingControl({ style, write, expanded, onExpandedChange }: ControlProps & { expanded: boolean; onExpandedChange: (value: boolean) => void }) {
  const sides = ["top", "right", "bottom", "left"] as const;
  const values = sides.map(side => Math.max(0, numericValue(styleValue(style, `padding-${side}`), 0)));
  const allEqual = values.every(value => value === values[0]);
  const updateSide = (side: typeof sides[number], value: number) => write({ [`padding-${side}`]: `${Math.max(0, value)}px` });
  const updateAll = (value: number) => write(Object.fromEntries(sides.map(side => [`padding-${side}`, `${Math.max(0, value)}px`])));
  return <div className="movecues-inspector__field"><div className="movecues-inspector__label-row"><span className="movecues-inspector__label">Padding</span><button type="button" className="movecues-inspector__link" aria-expanded={expanded} onClick={() => onExpandedChange(!expanded)}>{expanded ? "Use all sides" : "Edit sides"}</button></div>{expanded ? <div className="movecues-inspector__side-grid">{sides.map((side, index) => <UnitInput key={side} label={side[0].toUpperCase() + side.slice(1)} value={values[index]} min={0} onChange={value => updateSide(side, value)} />)}</div> : <UnitInput label="Padding all sides" value={allEqual ? values[0] : ""} placeholder={allEqual ? undefined : "Mixed"} min={0} onChange={updateAll} />}</div>;
}

function TypographyControls({ style, write }: ControlProps) {
  const font = normalizeCss(style.authored["font-family"] ?? "");
  const fontPreset = !font ? "default" : Object.entries(FONT_PRESETS).find(([, value]) => normalizeCss(value) === font)?.[0] ?? "custom";
  const weight = matchValue(styleValue(style, "font-weight"), ["400", "500", "600", "700"]);
  const size = Math.max(1, numericValue(styleValue(style, "font-size"), 14));
  const lineHeight = numericValue(styleValue(style, "line-height"), 1.5);
  const alignment = matchValue(styleValue(style, "text-align"), ["left", "center", "right"]);
  return <>
    <SegmentedControl label="Font" value={fontPreset} options={[{ value: "default", label: "Default" }, { value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }, { value: "monospace", label: "Mono" }]} onChange={value => write({ "font-family": value === "default" ? null : FONT_PRESETS[value as keyof typeof FONT_PRESETS] })} />
    {fontPreset === "custom" && <span className="movecues-inspector__custom">Custom font — edit in Advanced</span>}
    <SegmentedControl label="Weight" value={weight} options={[{ value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} onChange={value => write({ "font-weight": value })} />
    <UnitInput label="Size" value={size} min={1} onChange={value => write({ "font-size": `${value}px` })} />
    <Label className="movecues-inspector__field">Line height<Input aria-label="Line height" type="number" min={0.5} step={0.1} value={lineHeight} onChange={event => write({ "line-height": String(Math.max(0.5, Number(event.target.value))) })} /></Label>
    <ColorControl label="Text color" value={styleValue(style, "color")} fallback="#202020" onChange={value => write({ color: value })} />
    <SegmentedControl label="Alignment" value={alignment} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} onChange={value => write({ "text-align": value })} />
  </>;
}

function AppearanceControls({ style, write, background, corners, border, shadow }: ControlProps & { background: boolean; corners: boolean; border: boolean; shadow: boolean }) {
  const corner = presetFor(style.authored["border-radius"] ?? styleValue(style, "border-radius"), CORNER_PRESETS);
  const borderValue = presetFor(style.authored.border ?? "", BORDER_PRESETS);
  const shadowValue = presetFor(style.authored["box-shadow"] ?? "", SHADOW_PRESETS);
  return <>
    {background && <ColorControl label="Background" value={styleValue(style, "background-color")} fallback="#ffffff" onChange={value => write({ "background-color": value })} />}
    {corners && <SegmentedControl label="Corners" value={corner} options={[{ value: "square", label: "Square" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }]} onChange={value => write({ "border-radius": CORNER_PRESETS[value as keyof typeof CORNER_PRESETS] })} />}
    {border && <SegmentedControl label="Border" value={borderValue} options={[{ value: "none", label: "None" }, { value: "thin", label: "Thin" }]} onChange={value => write({ border: BORDER_PRESETS[value as keyof typeof BORDER_PRESETS] })} />}
    {shadow && <SegmentedControl label="Shadow" value={shadowValue} options={[{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "medium", label: "Medium" }, { value: "strong", label: "Strong" }]} onChange={value => write({ "box-shadow": SHADOW_PRESETS[value as keyof typeof SHADOW_PRESETS] })} />}
  </>;
}

function ColorControl({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (value: string) => void }) {
  const color = toHex(value, fallback);
  return <div className="movecues-inspector__field"><span className="movecues-inspector__label">{label}</span><div className="movecues-inspector__color"><input aria-label={`${label} picker`} type="color" value={color} onChange={event => onChange(event.target.value)} /><Input aria-label={label} value={color} onChange={event => /^#[0-9a-f]{6}$/i.test(event.target.value) && onChange(event.target.value)} /></div></div>;
}

function UnitInput({ label, value, min, placeholder, onChange }: { label: string; value: number | string; min: number; placeholder?: string; onChange: (value: number) => void }) {
  return <Label className="movecues-inspector__unit">{label}<span><Input aria-label={label} type="number" min={min} value={value} placeholder={placeholder} onChange={event => { const numeric = Number(event.target.value); if (Number.isFinite(numeric)) onChange(Math.max(min, numeric)); }} /><small>px</small></span></Label>;
}

interface ControlProps { style: InspectorStyleSnapshot; write: (patch: InspectorStylePatch) => void }

function styleValue(style: InspectorStyleSnapshot, property: string): string {
  return style.authored[property] ?? style.effective[property] ?? "";
}

function numericValue(value: string | undefined, fallback: number): number {
  const numeric = Number.parseFloat(value ?? "");
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeFlexAlignment(value: string): "flex-start" | "center" | "flex-end" {
  return value === "center" ? "center" : value === "flex-end" || value === "end" ? "flex-end" : "flex-start";
}

function normalizeCss(value: string): string { return value.toLowerCase().replace(/\s+/g, "").replace(/0px/g, "0"); }

function matchValue(value: string, values: string[]): string {
  const normalized = normalizeCss(value);
  return values.find(candidate => normalizeCss(candidate) === normalized) ?? "custom";
}

function presetFor<T extends Record<string, string>>(value: string, presets: T): string {
  const normalized = normalizeCss(value);
  return Object.entries(presets).find(([, preset]) => normalizeCss(preset) === normalized)?.[0] ?? "custom";
}

function toHex(value: string, fallback: string): string {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return `#${hex[1]}`;
  const short = value.trim().match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const rgb = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map(channel => Math.min(255, Number(channel)).toString(16).padStart(2, "0")).join("")}`;
  return fallback;
}

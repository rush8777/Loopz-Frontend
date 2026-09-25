import type { DragEvent, ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  ListChecks,
  MoreHorizontal,
  Plus,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Textarea,
} from "@movecues/ui";
import type { PageDefinition, Segment } from "../../types/api";
import type {
  ChecklistExperienceDefinition,
  ChecklistItem,
  Experience,
} from "../../types/experiences";
import { createChecklistItem } from "./checklistBuilder";
import { ExperienceAnalyticsView } from "./ExperienceAnalyticsView";

export type ChecklistSelection =
  | { type: "root" | "settings" | "targeting" | "completion" | "analytics" }
  | { type: "task"; itemId: string };

export function ChecklistStructurePanel({
  definition,
  selection,
  onSelect,
  onItemsChange,
}: {
  definition: ChecklistExperienceDefinition;
  selection: ChecklistSelection;
  onSelect(selection: ChecklistSelection): void;
  onItemsChange(items: ChecklistItem[]): void;
}) {
  const move = (index: number, target: number) => {
    if (target < 0 || target >= definition.items.length || index === target)
      return;
    const next = [...definition.items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onItemsChange(next);
  };
  const drop = (event: DragEvent, target: number) => {
    event.preventDefault();
    const source = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(source)) move(source, target);
  };
  const add = () => {
    const item = createChecklistItem();
    onItemsChange([...definition.items, item]);
    onSelect({ type: "task", itemId: item.id });
  };
  return (
    <aside
      className="flex min-h-0 flex-col border-r bg-background"
      aria-label="Checklist structure"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist
        </p>
        <button
          type="button"
          className={`mt-1 w-full rounded-md px-2 py-2 text-left ${selection.type === "root" ? "bg-primary/[0.08] text-foreground" : "hover:bg-muted/60"}`}
          onClick={() => onSelect({ type: "root" })}
        >
          <span className="block truncate text-sm font-medium">
            {definition.title || "Untitled checklist"}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            Checklist content
          </span>
        </button>
        <div className="mt-5 flex items-center justify-between px-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tasks
          </p>
          <span className="text-[10px] text-muted-foreground">
            {definition.items.length}/20
          </span>
        </div>
        <div className="mt-1 space-y-1">
          {definition.items.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-center">
              <p className="text-sm font-medium">No tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add tasks to guide users through onboarding.
              </p>
            </div>
          )}
          {definition.items.map((item, index) => {
            const warning = taskWarning(item);
            const selected =
              selection.type === "task" && selection.itemId === item.id;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => drop(event, index)}
                className={`group flex items-start rounded-md border border-transparent ${selected ? "border-primary/20 bg-primary/[0.07]" : "hover:bg-muted/60"}`}
              >
                <span
                  className="mt-2.5 cursor-grab px-1 text-muted-foreground/70"
                  aria-hidden="true"
                >
                  <GripVertical className="size-3.5" />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 py-2 text-left"
                  onClick={() => onSelect({ type: "task", itemId: item.id })}
                  aria-pressed={selected}
                >
                  <span className="block truncate text-sm font-medium">
                    {item.title || `Task ${index + 1}`}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[11px] ${warning ? "text-amber-700" : "text-muted-foreground"}`}
                  >
                    {warning ||
                      `${actionLabel(item)} · ${completionLabel(item)}`}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1.5 size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Task ${index + 1} options`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={index === 0}
                      onSelect={() => move(index, index - 1)}
                    >
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={index === definition.items.length - 1}
                      onSelect={() => move(index, index + 1)}
                    >
                      Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={definition.items.length === 1}
                      onSelect={() => {
                        onItemsChange(
                          definition.items.filter(
                            (value) => value.id !== item.id,
                          ),
                        );
                        onSelect({ type: "root" });
                      }}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full justify-start"
          disabled={definition.items.length >= 20}
          onClick={add}
        >
          <Plus />
          Add task
        </Button>
      </div>
      <nav className="space-y-0.5 border-t p-2" aria-label="Checklist settings">
        {(
          [
            ["settings", Settings2, "Checklist settings"],
            ["targeting", Target, "Targeting"],
            ["completion", CheckCircle2, "Completion state"],
            ["analytics", BarChart3, "Analytics"],
          ] as const
        ).map(([type, Icon, label]) => (
          <button
            key={type}
            type="button"
            className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm ${selection.type === type ? "bg-primary/[0.08] font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            onClick={() => onSelect({ type })}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function ChecklistInspector({
  definition,
  selection,
  guides,
  segments,
  pages,
  orgId,
  siteId,
  experienceId,
  onChange,
}: {
  definition: ChecklistExperienceDefinition;
  selection: ChecklistSelection;
  guides: Experience[];
  segments: Segment[];
  pages: PageDefinition[];
  orgId: string;
  siteId: string;
  experienceId: string;
  onChange(update: (next: ChecklistExperienceDefinition) => void): void;
}) {
  const item =
    selection.type === "task"
      ? definition.items.find((value) => value.id === selection.itemId)
      : undefined;
  if (selection.type === "task" && item)
    return (
      <TaskInspector
        item={item}
        guides={guides}
        segments={segments}
        onChange={(next) =>
          onChange((draft) => {
            const index = draft.items.findIndex(
              (value) => value.id === item.id,
            );
            if (index >= 0) draft.items[index] = next;
          })
        }
      />
    );
  if (selection.type === "settings")
    return <SettingsInspector definition={definition} onChange={onChange} />;
  if (selection.type === "targeting")
    return (
      <TargetingInspector
        definition={definition}
        segments={segments}
        pages={pages}
        onChange={onChange}
      />
    );
  if (selection.type === "completion")
    return <CompletionInspector definition={definition} onChange={onChange} />;
  if (selection.type === "analytics")
    return (
      <section className="space-y-3">
        <InspectorHeading
          icon={BarChart3}
          title="Analytics"
          description="Checklist engagement and completion."
        />
        <ExperienceAnalyticsView
          orgId={orgId}
          siteId={siteId}
          experienceId={experienceId}
        />
      </section>
    );
  return (
    <section className="space-y-3">
      <InspectorHeading
        icon={ListChecks}
        title="Checklist"
        description="Content shown at the top of the checklist."
      />
      <FieldGroup title="Content">
        <Label>
          Title
          <Input
            value={definition.title}
            onChange={(event) =>
              onChange((draft) => {
                draft.title = event.target.value;
              })
            }
          />
        </Label>
        <Label>
          Description
          <Textarea
            rows={3}
            value={definition.description ?? ""}
            onChange={(event) =>
              onChange((draft) => {
                draft.description = event.target.value;
              })
            }
          />
        </Label>
      </FieldGroup>
      <p className="text-xs text-muted-foreground">
        Select an element on the canvas to edit its appearance.
      </p>
    </section>
  );
}

function TaskInspector({
  item,
  guides,
  segments,
  onChange,
}: {
  item: ChecklistItem;
  guides: Experience[];
  segments: Segment[];
  onChange(item: ChecklistItem): void;
}) {
  const updateAction = (type: ChecklistItem["action"]["type"]) =>
    onChange({
      ...item,
      action:
        type === "launch_guide"
          ? { type, experienceId: guides[0]?.id ?? "" }
          : type === "navigate" || type === "open_url"
            ? { type, url: "" }
            : { type: "none" },
      ...(type === "none"
        ? { completion: { type: "item_clicked" as const } }
        : {}),
    });
  const updateCompletion = (type: ChecklistItem["completion"]["type"]) =>
    onChange({
      ...item,
      completion:
        type === "segment"
          ? { type, segmentId: segments[0]?.id ?? "" }
          : type === "guide_completed"
            ? { type, experienceId: guides[0]?.id ?? "" }
            : { type: "item_clicked" },
    });
  const warning = taskWarning(item);
  return (
    <section className="space-y-4">
      <InspectorHeading
        icon={ListChecks}
        title="Task"
        description="Logic is structured; appearance is edited below."
      />
      {warning && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warning}
        </p>
      )}
      <FieldGroup title="Content">
        <Label>
          Title
          <Input
            value={item.title}
            onChange={(event) =>
              onChange({ ...item, title: event.target.value })
            }
          />
        </Label>
        <Label>
          Description
          <Textarea
            rows={3}
            value={item.description ?? ""}
            onChange={(event) =>
              onChange({ ...item, description: event.target.value })
            }
          />
        </Label>
      </FieldGroup>
      <FieldGroup title="Action">
        <Label>
          On click
          <select
            value={item.action.type}
            onChange={(event) =>
              updateAction(
                event.target.value as ChecklistItem["action"]["type"],
              )
            }
          >
            <option value="none">No action</option>
            <option value="launch_guide">Launch Guide</option>
            <option value="navigate">Navigate in this tab</option>
            <option value="open_url">Open URL in new tab</option>
          </select>
        </Label>
        {item.action.type === "launch_guide" && (
          <Label>
            Guide
            <select
              value={item.action.experienceId}
              onChange={(event) =>
                onChange({
                  ...item,
                  action: {
                    type: "launch_guide",
                    experienceId: event.target.value,
                  },
                })
              }
            >
              <option value="">Select Guide</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
          </Label>
        )}
        {(item.action.type === "navigate" ||
          item.action.type === "open_url") && (
          <Label>
            {item.action.type === "navigate" ? "Destination" : "URL"}
            <Input
              value={item.action.url}
              placeholder={
                item.action.type === "navigate"
                  ? "/dashboard"
                  : "https://example.com"
              }
              onChange={(event) =>
                onChange({
                  ...item,
                  action: {
                    type: item.action.type as "navigate" | "open_url",
                    url: event.target.value,
                  },
                })
              }
            />
          </Label>
        )}
      </FieldGroup>
      <FieldGroup title="Completion">
        <Label>
          Complete when
          <select
            value={item.completion.type}
            disabled={item.action.type === "none"}
            onChange={(event) =>
              updateCompletion(
                event.target.value as ChecklistItem["completion"]["type"],
              )
            }
          >
            <option value="item_clicked">When clicked</option>
            <option value="segment">Matches saved Segment</option>
            <option value="guide_completed">Guide is completed</option>
          </select>
        </Label>
        {item.completion.type === "segment" && (
          <Label>
            Segment
            <select
              value={item.completion.segmentId}
              onChange={(event) =>
                onChange({
                  ...item,
                  completion: {
                    type: "segment",
                    segmentId: event.target.value,
                  },
                })
              }
            >
              <option value="">Select Segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </Label>
        )}
        {item.completion.type === "guide_completed" && (
          <Label>
            Guide
            <select
              value={item.completion.experienceId}
              onChange={(event) =>
                onChange({
                  ...item,
                  completion: {
                    type: "guide_completed",
                    experienceId: event.target.value,
                  },
                })
              }
            >
              <option value="">Select Guide</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
          </Label>
        )}
      </FieldGroup>
    </section>
  );
}

function SettingsInspector({ definition, onChange }: InspectorProps) {
  return (
    <section className="space-y-4">
      <InspectorHeading
        icon={Settings2}
        title="Checklist settings"
        description="How the checklist behaves for eligible users."
      />
      <FieldGroup title="Behavior">
        <Label>
          Position
          <select
            value={definition.behavior.position}
            onChange={(event) =>
              onChange((draft) => {
                draft.behavior.position = event.target
                  .value as typeof draft.behavior.position;
              })
            }
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </Label>
        <Label>
          Task order
          <select
            value={definition.behavior.order}
            onChange={(event) =>
              onChange((draft) => {
                draft.behavior.order = event.target
                  .value as typeof draft.behavior.order;
              })
            }
          >
            <option value="any">Any order</option>
            <option value="sequential">Sequential</option>
          </select>
        </Label>
        <Label>
          Initial state
          <select
            value={definition.behavior.initialState}
            onChange={(event) =>
              onChange((draft) => {
                draft.behavior.initialState = event.target
                  .value as typeof draft.behavior.initialState;
              })
            }
          >
            <option value="expanded">Expanded</option>
            <option value="collapsed">Collapsed</option>
          </select>
        </Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={definition.behavior.dismissible}
            onCheckedChange={(value) =>
              onChange((draft) => {
                draft.behavior.dismissible = value === true;
              })
            }
          />
          Allow permanent dismissal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={definition.behavior.showRemainingCount}
            onCheckedChange={(value) =>
              onChange((draft) => {
                draft.behavior.showRemainingCount = value === true;
              })
            }
          />
          Show remaining count
        </label>
      </FieldGroup>
    </section>
  );
}

function TargetingInspector({
  definition,
  segments,
  pages,
  onChange,
}: InspectorProps & { segments: Segment[]; pages: PageDefinition[] }) {
  const selectedPage =
    pages.find(
      (page) =>
        JSON.stringify(page.rules) ===
        JSON.stringify(definition.targeting.pageRules),
    )?.id ?? "all";
  return (
    <section className="space-y-4">
      <InspectorHeading
        icon={Target}
        title="Targeting"
        description="Choose where and for whom this checklist appears."
      />
      <FieldGroup title="Audience and pages">
        <Label>
          Audience
          <select
            value={
              definition.targeting.audience.type === "segment"
                ? definition.targeting.audience.segmentId
                : definition.targeting.audience.type
            }
            onChange={(event) =>
              onChange((draft) => {
                draft.targeting.audience =
                  event.target.value === "all"
                    ? { type: "all" }
                    : { type: "segment", segmentId: event.target.value };
              })
            }
          >
            <option value="all">Everyone</option>
            {definition.targeting.audience.type === "segment_rules" && (
              <option value="segment_rules" disabled>
                Combined segments
              </option>
            )}
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          Pages
          <select
            value={selectedPage}
            onChange={(event) =>
              onChange((draft) => {
                draft.targeting.pageRules =
                  event.target.value === "all"
                    ? []
                    : (pages.find((page) => page.id === event.target.value)
                        ?.rules ?? []);
              })
            }
          >
            <option value="all">All pages</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </Label>
      </FieldGroup>
      <FieldGroup title="Schedule">
        <Label>
          Start
          <Input
            type="datetime-local"
            value={definition.targeting.schedule?.startsAt?.slice(0, 16) ?? ""}
            onChange={(event) =>
              onChange((draft) => {
                draft.targeting.schedule = {
                  ...draft.targeting.schedule,
                  startsAt: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : undefined,
                };
              })
            }
          />
        </Label>
        <Label>
          End
          <Input
            type="datetime-local"
            value={definition.targeting.schedule?.endsAt?.slice(0, 16) ?? ""}
            onChange={(event) =>
              onChange((draft) => {
                draft.targeting.schedule = {
                  ...draft.targeting.schedule,
                  endsAt: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : undefined,
                };
              })
            }
          />
        </Label>
      </FieldGroup>
      <details className="group rounded-md border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
          Advanced{" "}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t p-3">
          <Label>
            Allowed origins (one per line)
            <Textarea
              rows={3}
              value={(definition.targeting.allowedOrigins ?? []).join("\n")}
              onChange={(event) =>
                onChange((draft) => {
                  draft.targeting.allowedOrigins = event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean);
                })
              }
            />
          </Label>
          <Label>
            Priority
            <Input
              type="number"
              min={-1000}
              max={1000}
              value={definition.targeting.priority}
              onChange={(event) =>
                onChange((draft) => {
                  draft.targeting.priority = Number(event.target.value);
                })
              }
            />
          </Label>
        </div>
      </details>
    </section>
  );
}

function CompletionInspector({ definition, onChange }: InspectorProps) {
  return (
    <section className="space-y-4">
      <InspectorHeading
        icon={CheckCircle2}
        title="Completion state"
        description="Shown once after every current task is complete."
      />
      <FieldGroup title="Message">
        <Label>
          Title
          <Input
            value={definition.completionMessage.title}
            onChange={(event) =>
              onChange((draft) => {
                draft.completionMessage.title = event.target.value;
              })
            }
          />
        </Label>
        <Label>
          Description
          <Textarea
            rows={3}
            value={definition.completionMessage.description ?? ""}
            onChange={(event) =>
              onChange((draft) => {
                draft.completionMessage.description = event.target.value;
              })
            }
          />
        </Label>
        <Label>
          Button label
          <Input
            value={definition.completionMessage.acknowledgeLabel}
            onChange={(event) =>
              onChange((draft) => {
                draft.completionMessage.acknowledgeLabel = event.target.value;
              })
            }
          />
        </Label>
      </FieldGroup>
    </section>
  );
}

function InspectorHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ListChecks;
  title: string;
  description: string;
}) {
  return (
    <header>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </header>
  );
}
function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
interface InspectorProps {
  definition: ChecklistExperienceDefinition;
  onChange(update: (next: ChecklistExperienceDefinition) => void): void;
}

function actionLabel(item: ChecklistItem) {
  return item.action.type === "launch_guide"
    ? "Launch Guide"
    : item.action.type === "navigate"
      ? "Navigate"
      : item.action.type === "open_url"
        ? "Open URL"
        : "No action";
}
function completionLabel(item: ChecklistItem) {
  return item.completion.type === "segment"
    ? "Segment completion"
    : item.completion.type === "guide_completed"
      ? "Guide completion"
      : "Complete on click";
}
function taskWarning(item: ChecklistItem) {
  if (!item.title.trim()) return "Missing title";
  if (item.action.type === "launch_guide" && !item.action.experienceId)
    return "Missing Guide";
  if (
    (item.action.type === "navigate" || item.action.type === "open_url") &&
    !item.action.url.trim()
  )
    return "Missing URL";
  if (item.completion.type === "segment" && !item.completion.segmentId)
    return "Missing Segment";
  if (
    item.completion.type === "guide_completed" &&
    !item.completion.experienceId
  )
    return "Missing completion Guide";
  return null;
}

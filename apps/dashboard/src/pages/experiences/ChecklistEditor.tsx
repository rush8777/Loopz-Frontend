import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@movecues/ui";
import * as experiencesApi from "../../api/experiences";
import type { PageDefinition, Segment } from "../../types/api";
import type {
  ChecklistExperienceDefinition,
  Experience,
} from "../../types/experiences";
import {
  GrapesWidgetBuilder,
  type GrapesWidgetBuilderHandle,
} from "../../components/experiences/GrapesWidgetBuilder";
import {
  ChecklistInspector,
  ChecklistStructurePanel,
  type ChecklistSelection,
} from "../../components/experiences/ChecklistEditorPanels";
import { syncChecklistBuilder } from "../../components/experiences/checklistBuilder";
import { ErrorNotice } from "@/components/PageSurface";

const DESIGN = {
  width: "md" as const,
  size: {
    width: { mode: "fixed" as const, value: 360 },
    height: { mode: "auto" as const },
  },
  theme: {
    background: "#fff",
    foreground: "#111827",
    primary: "#2563eb",
    borderRadius: "md" as const,
  },
};

interface ChecklistEditorProps {
  experience: Experience;
  definition: ChecklistExperienceDefinition;
  orgId: string;
  siteId: string;
  pages: PageDefinition[];
  segments: Segment[];
  status: string;
  publishing: boolean;
  error: string | null;
  onChange(definition: ChecklistExperienceDefinition): void;
  onPublish(): void;
}

export function ChecklistEditor({
  experience,
  definition,
  orgId,
  siteId,
  pages,
  segments,
  status,
  publishing,
  error,
  onChange,
  onPublish,
}: ChecklistEditorProps) {
  const [guides, setGuides] = useState<Experience[]>([]);
  const [selection, setSelection] = useState<ChecklistSelection>({
    type: "root",
  });
  const builder = useRef<GrapesWidgetBuilderHandle | null>(null);

  useEffect(() => {
    void experiencesApi
      .listExperiences(orgId, siteId, "guide")
      .then((result) => setGuides(result.experiences))
      .catch(() => setGuides([]));
  }, [orgId, siteId]);

  useEffect(() => {
    if (
      selection.type === "task" &&
      !definition.items.some((item) => item.id === selection.itemId)
    )
      setSelection({ type: "root" });
  }, [definition.items, selection]);

  const structured = (
    update: (next: ChecklistExperienceDefinition) => void,
  ) => {
    const next = structuredClone(definition);
    update(next);
    next.builder = syncChecklistBuilder(next.builder, next);
    onChange(next);
  };
  const select = (next: ChecklistSelection) => {
    setSelection(next);
    if (next.type === "task") builder.current?.selectChecklistItem(next.itemId);
    else if (next.type === "root") builder.current?.selectChecklistRoot();
  };

  const inspector = (
    <ChecklistInspector
      definition={definition}
      selection={selection}
      guides={guides}
      segments={segments}
      pages={pages}
      orgId={orgId}
      siteId={siteId}
      experienceId={experience.id}
      onChange={structured}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-[620px] flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/experiences/checklists">
              <ArrowLeft /> <span className="hidden sm:inline">Checklists</span>
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {experience.name}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Draft <span aria-hidden="true">·</span> {status || "Saved"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={publishing}
          onClick={() => {
            builder.current?.flush();
            onPublish();
          }}
        >
          {publishing ? "Publishing..." : "Publish"}
        </Button>
      </header>
      {error && (
        <div className="shrink-0 px-3 pt-3">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)]">
        <ChecklistStructurePanel
          definition={definition}
          selection={selection}
          onSelect={select}
          onItemsChange={(items) =>
            structured((next) => {
              next.items = items;
            })
          }
        />
        <main className="min-w-0 overflow-hidden">
          <GrapesWidgetBuilder
            ref={builder}
            experienceKey={`${experience.id}:${experience.draftVersion?.id}`}
            widgetType="modal"
            interactionContext="checklist"
            value={definition.builder}
            checklistItems={definition.items}
            checklistCopy={{
              title: definition.title,
              description: definition.description,
              completionMessage: definition.completionMessage,
            }}
            checklistOrder={definition.behavior.order}
            checklistInspector={inspector}
            onChecklistSelectionChange={(next) =>
              setSelection(
                next.type === "task"
                  ? { type: "task", itemId: next.itemId }
                  : { type: "root" },
              )
            }
            content={{
              heading: definition.title,
              body: definition.description ?? "",
            }}
            design={DESIGN}
            onChange={(value) =>
              onChange({ ...definition, builder: value.builder })
            }
            onPrimaryActionChange={() => undefined}
            onSizeChange={() => undefined}
          />
        </main>
      </div>
    </div>
  );
}

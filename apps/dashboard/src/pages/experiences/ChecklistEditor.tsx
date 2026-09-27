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
  preparingReview: boolean;
  error: string | null;
  onChange(definition: ChecklistExperienceDefinition): void;
  onReview(): void;
  onRegisterBuilderFlush(flush: (() => void) | null): void;
}

export function ChecklistEditor({
  experience,
  definition,
  orgId,
  siteId,
  pages,
  segments,
  status,
  preparingReview,
  error,
  onChange,
  onReview,
  onRegisterBuilderFlush,
}: ChecklistEditorProps) {
  const [guides, setGuides] = useState<Experience[]>([]);
  const [selection, setSelection] = useState<ChecklistSelection>({
    type: "root",
  });
  const builder = useRef<GrapesWidgetBuilderHandle | null>(null);

  useEffect(() => {
    onRegisterBuilderFlush(() => builder.current?.flush());
    return () => onRegisterBuilderFlush(null);
  }, [onRegisterBuilderFlush]);

  useEffect(() => {
    let active = true;
    const loadGuides = () => {
      void experiencesApi
        .listExperiences(orgId, siteId, "guide")
        .then((result) => {
          if (active) setGuides(result.experiences);
        })
        .catch(() => {
          if (active) setGuides([]);
        });
    };
    loadGuides();
    window.addEventListener("focus", loadGuides);
    return () => {
      active = false;
      window.removeEventListener("focus", loadGuides);
    };
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
  const visibleStatus = status || "Saved";
  const statusClass = visibleStatus === "Published" ? "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200" : visibleStatus === "Saving..." ? "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200" : visibleStatus.startsWith("Autosave failed") ? "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20" : "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200";

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/experiences/checklists">
              <ArrowLeft /> <span className="hidden sm:inline">Checklists</span>
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold">
              {experience.name}
            </h1>
            <span className={visibleStatus === "Published" ? "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200" : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200"}>{visibleStatus === "Published" ? "Published" : "Draft"}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{visibleStatus}</span>
            <p className="hidden text-[11px] text-muted-foreground">
              Draft <span aria-hidden="true">·</span> {status || "Saved"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={preparingReview}
          onClick={onReview}
        >
          {preparingReview ? "Preparing…" : "Review & publish"}
        </Button>
      </header>
      {error && (
        <div className="shrink-0 px-3 pt-3">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
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
        <main className="h-full min-w-0 overflow-visible">
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

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import * as funnelsApi from "../../api/funnels";
import * as eventsApi from "../../api/events";
import * as pagesApi from "../../api/pages";
import type { FunnelConversionWindow } from "../../api/funnels";
import type { FunnelStep, PageDefinition } from "../../types/api";

const WINDOW_PRESETS: { label: string; window: FunnelConversionWindow }[] = [
  { label: "1 hour", window: { value: 1, unit: "hours" } },
  { label: "24 hours", window: { value: 24, unit: "hours" } },
  { label: "3 days", window: { value: 3, unit: "days" } },
  { label: "7 days", window: { value: 7, unit: "days" } },
  { label: "14 days", window: { value: 14, unit: "days" } },
  { label: "30 days", window: { value: 30, unit: "days" } },
];

function windowKey(w: FunnelConversionWindow): string {
  return `${w.value}${w.unit}`;
}

function newEventStep(): FunnelStep {
  return { type: "event", eventName: "" };
}

export function FunnelBuilderPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const { funnelId } = useParams<{ funnelId?: string }>();
  const isEditing = Boolean(funnelId);

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<FunnelStep[]>(() => [newEventStep(), newEventStep()]);
  const [conversionWindow, setConversionWindow] = useState<FunnelConversionWindow>({ value: 24, unit: "hours" });

  const [eventNames, setEventNames] = useState<string[]>([]);
  const [pages, setPages] = useState<PageDefinition[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    eventsApi.listEvents(currentOrg.orgId, currentSite.id, { limit: 100 }).then((res) => setEventNames(res.events.map((e) => e.name)));
    pagesApi.listPages(currentOrg.orgId, currentSite.id).then((res) => setPages(res.pages));
  }, [currentOrg, currentSite]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !funnelId) return;
    funnelsApi.getFunnel(currentOrg.orgId, currentSite.id, funnelId).then((funnel) => {
      setName(funnel.name);
      setDescription(funnel.description ?? "");
      setSteps(funnel.steps);
      const minutes = funnel.conversionWindowMinutes;
      const preset = WINDOW_PRESETS.find((p) => (p.window.unit === "hours" ? p.window.value * 60 : p.window.value * 60 * 24) === minutes);
      setConversionWindow(preset?.window ?? { value: Math.round(minutes / 60), unit: "hours" });
      setLoaded(true);
    });
  }, [currentOrg, currentSite, funnelId]);

  function updateStep(index: number, next: FunnelStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }
  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addStep() {
    setSteps((prev) => [...prev, newEventStep()]);
  }

  const stepsComplete = steps.length > 0 && steps.every((s) => (s.type === "event" ? s.eventName.trim().length > 0 : s.pageId.trim().length > 0));

  async function save() {
    if (!currentOrg || !currentSite || !name.trim() || !stepsComplete) return;
    setSaving(true);
    setSaveError(null);
    const input = { name: name.trim(), description: description.trim() || undefined, steps, conversionWindow };
    try {
      const saved = isEditing
        ? await funnelsApi.updateFunnel(currentOrg.orgId, currentSite.id, funnelId!, input)
        : await funnelsApi.createFunnel(currentOrg.orgId, currentSite.id, input);
      navigate(`/observe/funnels/${saved.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setSaveError(
        message === "invalid_step_reference"
          ? "One of these steps references an event or page that doesn't exist for this site."
          : "Couldn't save this funnel - please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!currentSite || !loaded) {
    return (
      <>
        <PageHeader section="Observe" title={isEditing ? "Edit funnel" : "Create funnel"} />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 240 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Observe"
        title={isEditing ? "Edit funnel" : "Create funnel"}
        description="An ordered sequence of steps users are expected to complete, in order."
      />

      <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Signup Activation" />
        </div>
        <div className="field">
          <label>Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Main signup activation flow" />
        </div>
        <div className="field">
          <label>Conversion window</label>
          <select
            className="input"
            style={{ width: 200 }}
            value={windowKey(conversionWindow)}
            onChange={(e) => {
              const found = WINDOW_PRESETS.find((p) => windowKey(p.window) === e.target.value);
              if (found) setConversionWindow(found.window);
            }}
          >
            {WINDOW_PRESETS.map((p) => (
              <option key={windowKey(p.window)} value={windowKey(p.window)}>
                {p.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Users must complete every later step within this window of their first step.
          </div>
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Steps</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              step={step}
              total={steps.length}
              eventNames={eventNames}
              pages={pages}
              onChange={(next) => updateStep(i, next)}
              onRemove={() => removeStep(i)}
              onMoveUp={() => moveStep(i, -1)}
              onMoveDown={() => moveStep(i, 1)}
            />
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addStep}>
          + Add step
        </button>
      </div>

      {saveError && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {saveError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !stepsComplete}>
          {saving ? "Saving…" : isEditing ? "Save changes" : "Save funnel"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </>
  );
}

function StepRow({
  index,
  step,
  total,
  eventNames,
  pages,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  step: FunnelStep;
  total: number;
  eventNames: string[];
  pages: PageDefinition[];
  onChange: (next: FunnelStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="card card-padded" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button className="btn btn-ghost btn-sm" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={onMoveUp}>
          ↑
        </button>
        <button className="btn btn-ghost btn-sm" aria-label={`Move step ${index + 1} down`} disabled={index === total - 1} onClick={onMoveDown}>
          ↓
        </button>
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", width: 20 }}>{index + 1}.</div>

      <select
        className="input"
        style={{ width: 110 }}
        value={step.type}
        onChange={(e) => onChange(e.target.value === "event" ? { type: "event", eventName: "" } : { type: "page", pageId: "" })}
      >
        <option value="event">Event</option>
        <option value="page">Page</option>
      </select>

      {step.type === "event" ? (
        <>
          <input
            className="input"
            style={{ width: 200 }}
            list="funnel-event-names"
            placeholder="Search events…"
            value={step.eventName}
            onChange={(e) => onChange({ ...step, eventName: e.target.value })}
          />
          <datalist id="funnel-event-names">
            {eventNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </>
      ) : (
        <select className="input" style={{ width: 200 }} value={step.pageId} onChange={(e) => onChange({ ...step, pageId: e.target.value })}>
          <option value="">Select a page…</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <input
        className="input"
        style={{ width: 180 }}
        placeholder="Display label (optional)"
        value={step.label ?? ""}
        onChange={(e) => onChange({ ...step, label: e.target.value || undefined })}
      />

      <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRemove} disabled={total <= 1}>
        Remove
      </button>
    </div>
  );
}

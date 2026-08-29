import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../auth/WorkspaceContext";
import { PageHeader } from "../../components/PageHeader";
import * as segmentsApi from "../../api/segments";
import * as eventsApi from "../../api/events";
import * as pagesApi from "../../api/pages";
import type { PageDefinition, SegmentGroup } from "../../types/api";
import { emptyGroup, isDefinitionComplete } from "../../lib/segmentDefinition";
import { ConditionGroupEditor } from "./ConditionGroupEditor";

export function SegmentBuilderPage() {
  const { currentOrg, currentSite } = useWorkspace();
  const navigate = useNavigate();
  const { segmentId } = useParams<{ segmentId?: string }>();
  const isEditing = Boolean(segmentId);

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<SegmentGroup>(() => emptyGroup());

  const [eventNames, setEventNames] = useState<string[]>([]);
  const [pages, setPages] = useState<PageDefinition[]>([]);

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Event names (for the condition autocomplete) and Pages (for the page-condition dropdown) - both reused from existing surfaces, not re-fetched raw data.
  useEffect(() => {
    if (!currentOrg || !currentSite) return;
    eventsApi.listEvents(currentOrg.orgId, currentSite.id, { limit: 100 }).then((res) => setEventNames(res.events.map((e) => e.name)));
    pagesApi.listPages(currentOrg.orgId, currentSite.id).then((res) => setPages(res.pages));
  }, [currentOrg, currentSite]);

  useEffect(() => {
    if (!currentOrg || !currentSite || !segmentId) return;
    segmentsApi.getSegment(currentOrg.orgId, currentSite.id, segmentId).then((segment) => {
      setName(segment.name);
      setDescription(segment.description ?? "");
      setDefinition(segment.definition);
      setLoaded(true);
    });
  }, [currentOrg, currentSite, segmentId]);

  // Live audience preview (task brief section 13): re-request on any definition
  // change, debounced so we don't fire on every keystroke, and only once the
  // definition is actually complete enough to evaluate.
  useEffect(() => {
    if (!currentOrg || !currentSite || !loaded) return;
    if (!isDefinitionComplete(definition)) {
      setAudienceCount(null);
      setPreviewError(null);
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    const handle = setTimeout(() => {
      segmentsApi
        .previewSegment(currentOrg.orgId, currentSite.id, definition)
        .then((res) => setAudienceCount(res.audienceCount))
        .catch(() => setPreviewError("Couldn't estimate this audience."))
        .finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg, currentSite, loaded, JSON.stringify(definition)]);

  async function save() {
    if (!currentOrg || !currentSite || !name.trim()) return;
    if (!isDefinitionComplete(definition)) {
      setSaveError("Finish filling in every condition before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const input = { name: name.trim(), description: description.trim() || undefined, definition };
    try {
      const saved = isEditing
        ? await segmentsApi.updateSegment(currentOrg.orgId, currentSite.id, segmentId!, input)
        : await segmentsApi.createSegment(currentOrg.orgId, currentSite.id, input);
      navigate(`/segments/${saved.id}`);
    } catch {
      setSaveError("Couldn't save this segment - please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!currentSite || !loaded) {
    return (
      <>
        <PageHeader section="Users" title={isEditing ? "Edit segment" : "Create segment"} />
        <div className="card" style={{ padding: 16 }}>
          <div className="skeleton" style={{ height: 240 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="Users"
        title={isEditing ? "Edit segment" : "Create segment"}
        description="Users who match every condition below become part of this segment. Membership is computed live from current data - it's never a fixed snapshot."
      />

      <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="High-intent trial users" />
        </div>
        <div className="field">
          <label>Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Users who started checkout but haven't completed it"
          />
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Users who match</div>
        <ConditionGroupEditor group={definition} onChange={setDefinition} eventNames={eventNames} pages={pages} depth={0} />
      </div>

      <div className="card card-padded" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Estimated audience</div>
        {previewError ? (
          <div className="error-banner">{previewError}</div>
        ) : audienceCount === null ? (
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-muted)" }}>{previewing ? "Calculating…" : "—"}</div>
        ) : (
          <div style={{ fontSize: 22, fontWeight: 600, opacity: previewing ? 0.6 : 1 }}>{audienceCount.toLocaleString()} users</div>
        )}
      </div>

      {saveError && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {saveError}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : isEditing ? "Save changes" : "Save segment"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </>
  );
}

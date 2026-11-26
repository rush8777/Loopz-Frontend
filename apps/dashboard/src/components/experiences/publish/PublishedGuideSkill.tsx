import { useEffect, useState } from "react";
import { Button, Checkbox } from "@movcues/ui";
import { agentSkills, skillStatus, type AgentSkill, type SkillMetadata } from "../../../api/agentSkills";
import type { Experience } from "../../../types/experiences";
import { emptyMetadata, SkillMetadataFields, validMetadata } from "./SkillMetadataFields";

export function PublishedGuideSkill({ orgId, experience }: { orgId: string; experience: Experience }) {
  const [open, setOpen] = useState(false);
  const version = experience.publishedVersion;
  if (!version) return null;
  return <details className="my-4 rounded-lg border p-4" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-medium">Geo Agent availability</summary>
    {open && <SkillSettings key={version.id} experience={experience} orgId={orgId} version={version} />}
  </details>;
}

function SkillSettings({ orgId, experience, version }: { orgId: string; experience: Experience; version: NonNullable<Experience["publishedVersion"]> }) {
  const { id, siteId, name } = experience;
  const [record, setRecord] = useState<AgentSkill | null>(null);
  const [metadata, setMetadata] = useState<SkillMetadata>(() => emptyMetadata(name));
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void agentSkills(orgId, siteId).list(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      const skill = data.skills.find(item => item.guideId === id) ?? null;
      setRecord(skill);
      setMetadata(skill?.metadata ?? emptyMetadata(name));
      setEnabled(skill?.enabled ?? false);
      setReady(true);
    }).catch(() => { if (!controller.signal.aborted) setNotice("Couldn’t load skill settings."); });
    return () => controller.abort();
  }, [orgId, siteId, id, name, reload]);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const { skill } = await agentSkills(orgId, siteId).update(id, version.id, record?.revision ?? null, { enabled, ...(enabled ? { metadata } : {}) });
      setRecord(skill);
      setNotice("Skill settings saved.");
    } catch (error) {
      setNotice(error instanceof Error && error.message === "skill_revision_changed"
        ? "The skill changed elsewhere. Refresh the status and review the settings again."
        : "Couldn’t save skill settings. Confirm that this guide is published and try again.");
    } finally {
      setSaving(false);
    }
  }
  return <div className="mt-3 grid gap-3">
    <p className="text-sm text-muted-foreground">{record ? skillStatus[record.status] : "Skill registration pending approval"}</p>
    {ready && <fieldset disabled={saving} className="grid gap-3">
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabled} disabled={experience.status !== "published" && !enabled} onCheckedChange={checked => setEnabled(checked === true)} />Make this guide available to Geo Agent</label>
      {enabled && <SkillMetadataFields key={reload} value={metadata} onChange={setMetadata} suggest={() => agentSkills(orgId, siteId).suggest(id, version.id, version.revision)} />}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || (enabled ? experience.status !== "published" || !validMetadata(metadata) : !record?.enabled)}>
          {saving ? "Saving…" : record?.status === "failed" && enabled ? "Save and retry indexing" : "Save availability"}
        </Button>
      </div>
    </fieldset>}
    <Button type="button" size="sm" variant="ghost" className="w-fit" disabled={saving} onClick={() => { setNotice(""); setReady(false); setReload(n => n + 1); }}>Refresh status</Button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </div>;
}

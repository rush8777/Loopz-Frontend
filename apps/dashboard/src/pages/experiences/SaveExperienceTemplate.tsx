import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from "@movcues/ui";
import { saveExperienceTemplate } from "../../api/experiences";
import type { Experience } from "../../types/experiences";

export function SaveExperienceTemplate({ orgId, siteId, experience, open, onOpenChange }: {
  orgId: string; siteId: string; experience: Experience; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const version = experience.draftVersion ?? experience.publishedVersion;
  async function save() {
    if (!version || !name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await saveExperienceTemplate(orgId, siteId, experience.id, { name: name.trim(), versionId: version.id, revision: version.revision });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The template couldn't be saved.");
    } finally { setBusy(false); }
  }
  function close(next: boolean) {
    if (busy) return;
    if (!next) { setName(""); setError(""); setSaved(false); }
    onOpenChange(next);
  }
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent>
      <DialogHeader><DialogTitle>Save as template</DialogTitle>
        <DialogDescription>Reuse this saved layout. New experiences start with placeholder content and fresh configuration.</DialogDescription>
      </DialogHeader>
      {saved ? <p role="status" className="text-sm">Template saved to this site's library.</p> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}>
        <Label className="grid gap-2">Template name<Input autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)}/></Label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="submit" disabled={busy || !name.trim() || !version}>{busy ? "Saving…" : "Save template"}</Button></DialogFooter>
      </form>}
      {saved && <DialogFooter><Button onClick={() => close(false)}>Done</Button></DialogFooter>}
    </DialogContent>
  </Dialog>;
}

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@movcues/ui";
import type { SkillMetadata, SkillSuggestion } from "../../../api/agentSkills";

export const emptyMetadata = (name: string): SkillMetadata => ({
  name: name.slice(0, 100), description: "", intentExamples: [], keywords: [], preconditions: [],
});

export function validMetadata(metadata: SkillMetadata) {
  const plain = (text: string, max: number) => text.trim().length > 0 && text.trim().length <= max && !/[\u0000-\u001f\u007f<>]/.test(text);
  return plain(metadata.name, 100) && plain(metadata.description, 500)
    && metadata.intentExamples.length > 0 && metadata.intentExamples.length <= 8 && metadata.intentExamples.every(line => plain(line, 140))
    && metadata.keywords.length <= 15 && metadata.keywords.every(line => plain(line, 45))
    && metadata.preconditions.length <= 8 && metadata.preconditions.every(line => plain(line, 160))
    && (!metadata.completionEvidence || plain(metadata.completionEvidence, 160));
}

export function SkillMetadataFields({ value, onChange, suggest }: {
  value: SkillMetadata;
  onChange(metadata: SkillMetadata): void;
  suggest(): Promise<SkillSuggestion>;
}) {
  const [generation, setGeneration] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const lines = (input: string) => input.split("\n").map(line => line.trim()).filter(Boolean);
  const patch = (fields: Partial<SkillMetadata>) => onChange({ ...value, ...fields });

  async function generate() {
    setGenerating(true);
    setNotice("");
    try {
      const result = await suggest();
      onChange({ ...result.metadata, preconditions: value.preconditions, completionEvidence: value.completionEvidence });
      setGeneration(previous => previous + 1);
      setNotice(result.method === "ai" ? "Review the suggested details before enabling the skill." : "Manual starter details are ready to edit.");
    } catch {
      setNotice("Couldn’t load a suggestion. Enter metadata below or try again.");
    } finally {
      setGenerating(false);
    }
  }
  return <fieldset className="grid gap-3" disabled={generating}>
    <Button className="w-fit" type="button" variant="outline" size="sm" onClick={() => void generate()}>{generating ? "Generating…" : "Suggest metadata"}</Button>
    {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
    <Label className="grid gap-1.5">Skill name<Input value={value.name} maxLength={100} onChange={event => patch({ name: event.target.value })} /></Label>
    <Label className="grid gap-1.5">Skill description<Input value={value.description} maxLength={500} onChange={event => patch({ description: event.target.value })} /></Label>
    <Label className="grid gap-1.5">Example requests, one per line<Textarea key={`intents-${generation}`} rows={3} defaultValue={value.intentExamples.join("\n")} onChange={event => patch({ intentExamples: lines(event.target.value) })} /></Label>
    <Label className="grid gap-1.5">Keywords, one per line<Textarea key={`keywords-${generation}`} rows={2} defaultValue={value.keywords.join("\n")} onChange={event => patch({ keywords: lines(event.target.value) })} /></Label>
    <details className="text-sm">
      <summary className="cursor-pointer">Workflow requirements</summary>
      <p className="my-2 text-xs text-muted-foreground">Adding a requirement with no automatic verification makes the skill unavailable to visitors.</p>
      <Label className="grid gap-1.5">Requirements, one per line<Textarea rows={2} defaultValue={value.preconditions.join("\n")} onChange={event => patch({ preconditions: lines(event.target.value) })} /></Label>
      <Label className="mt-3 grid gap-1.5">Completion evidence<Input value={value.completionEvidence ?? ""} maxLength={160} onChange={event => patch({ completionEvidence: event.target.value || undefined })} /></Label>
    </details>
  </fieldset>;
}

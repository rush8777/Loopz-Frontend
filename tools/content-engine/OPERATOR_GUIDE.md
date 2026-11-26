# Movcues content engine: operator handoff

This is a Codex-assisted editorial workflow, not an autonomous publishing service. The scripts validate and persist supplied artifacts; they do not search the web, write articles, perform independent reviews, connect to Sanity, or inspect previews by themselves. Codex and an authorized editor carry out those steps. A human editor other than the owner may review a brief and approve a final revision if authorized by the organization.

## One-time access

1. Give each operator access to this repository and Codex, an approved real author byline, and the appropriate Sanity project/dataset permissions. Do not share personal tokens. The current Studio requires `SANITY_STUDIO_PROJECT_ID`; its dataset defaults to `production`. Confirm both with the project administrator before use.
2. Install the repository dependencies and the content engine's `jsdom` dependency using the project's normal package installation process. From the repository root, run `node --test tools/content-engine/tests/*.test.mjs`. Do not treat tests as proof that external services work.
3. Connect the operator's own Sanity MCP account. Verify the target project and dataset, and check draft permissions and the Studio preview before accepting real assignments. Access is account-specific.
4. Read `WORKFLOW.md`, `POLICIES.md`, `config/quality-gates.json`, and the project skill. The local website and Studio contain a staged dynamic-category migration. The deployed production `blogPost` schema inspected on 2026-11-21 still requires one of the four legacy topics and does not contain the new category and tag fields. New categories require a verified compatible website/Studio deployment and a published active category. The validator currently permits publication checks only for legacy topics and deliberately disables programmatic publication.

## Start an assignment

In Codex, request `$movcues-content-pipeline` and provide a reference URL or ask for discovery, choose a voice, and provide the byline, target audience, and goal. Fictional bylines must be disclosed to readers; real people must approve attribution. An article request authorizes preparation of a Sanity draft. A single explicit publish request after inspection of the exact revision serves as editorial approval.

> Use $movcues-content-pipeline to research an original Movcues article based on https://example.org/article, with the analyst voice and byline [approved contributor]. Prepare a brief for editorial review. Do not publish.

Codex must research sources and check existing published posts, disclose missing data, prepare a brief, and obtain an authorized editor's approval before writing. Never represent an unavailable keyword metric or an unchecked source as verified. Follow the skill's separate human approval requirement before any publication.

## Persist and resume

The low-level run tracker accepts JSON artifacts produced by the operator or Codex. It does not generate them. From the repository root:

```powershell
node tools/content-engine/scripts/runs.mjs my-article research path/to/research-input.json
node tools/content-engine/scripts/runs.mjs status my-article
node tools/content-engine/scripts/runs.mjs my-article brief path/to/approved-brief.json
```

Stages are `research`, `brief`, `article`, `editorial`, `optimization`, and `qa`, in that order. A brief must contain `reviewStatus: "approved"` **only after** an authorized human approves it. A local JSON flag is a record, not proof of identity. Research input must contain the fields checked by `scripts/research.mjs`; incomplete research is saved and reports what is missing. QA must contain the matching article fingerprint, evidence for the required checks, and no unresolved blockers. The separately authorized draft adapter is not connected to this stage command.

The status command reports missing stages and altered or missing recorded artifacts. Re-save a changed stage with the tracker, then redo affected later stages. Editing a prior stage invalidates later stage status, although old files remain in the ignored run folder for inspection; do not treat them as current. Runs, local reference bodies, and credentials must never be committed.

## Review, draft, and preview

Have independent fact/product and editorial reviews performed, with evidence recorded against the exact article fingerprint. Run `node tools/content-engine/scripts/validate-article.mjs path/to/article.json`. A passing deterministic check does not prove accuracy, originality, independent review, or website rendering. Resolve blockers and review the actual links, accessibility, and rendered mobile and desktop preview.

Use the authenticated Sanity MCP for a draft only after the article and target project/dataset have been checked. `scripts/sanity-draft.mjs` is a library requiring a supplied Sanity client; it is not a standalone connected command. Confirm the returned draft ID and inspect the Studio's **Preview blog article** action. Do not claim the local adapter has validated the deployed schema or preview without checking them.

Publication requires a separate explicit instruction from an authorized human for the exact inspected Sanity revision and all applicable QA gates. A local approval file is not an authentication boundary. The existing validator intentionally blocks automated publication. Record the returned document ID and URL after an authorized publication, then measure real outcomes only when data is available.

## House voices

Each profile is an original Movcues style, not a source author's identity or byline. The analyst manifest has 20 metadata-only URLs; its analysis and holdout evaluation remain incomplete. Founder and practitioner are starter profiles. For each, collect authorized references, record permissions and the training/holdout split, analyze broad stylistic features without copying, and evaluate original drafts against the holdout. `references.mjs import` requires a locally supplied HTML file and confirmed permission to store and analyze it; it does not download pages or establish permissions. `references.mjs profile VOICE` summarizes imported samples but does not independently evaluate writing quality.

## When blocked

If a source is inaccessible, access is missing, the preview fails, a category has not been deployed, or evidence cannot be verified, record the specific blocker and notify the responsible editor. Do not fabricate evidence or repeatedly retry an unchanged failure. The workflow allows two targeted repair attempts per finding before escalation.

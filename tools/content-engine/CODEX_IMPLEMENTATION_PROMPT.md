# Codex implementation prompt — paste into Codex while opening Loopz-Frontend repo root

You are working locally in my existing Windows checkout of `rush8777/Loopz-Frontend`. The folder `tools/content-engine/` and skill `.agents/skills/movcues-content-pipeline/SKILL.md` have been copied into the repo. Your job is to **complete a safe, local, reusable SEO + AEO/GEO article publishing pipeline for the Movcues blog** using the existing Sanity MCP. Do not begin by writing or publishing an article.

## Safety and environment constraints

- Inspect `git status`, current branch, uncommitted changes, and repo-specific instructions before editing. Preserve all uncommitted work. Create a dedicated feature branch if possible; do not commit directly to main. Do not blindly reset, stash, or overwrite local changes.
- Inspect actual repo code and use it as source of truth. In particular: `cms/studio/blogPost.ts`, `cms/studio/sanity.config.ts`, `apps/website/src/blog/config.mjs`, `content.mjs`, `handler.mjs`, `render.mjs`, `apps/website/test/blog.test.mjs`, worker script, and existing test/build commands. The 2026-11-21 snapshot contained only four hardcoded topic choices. That is not our desired editorial restriction.
- Read every file in `tools/content-engine/` and the `.agents` skill. Keep this workflow **outside public website runtime**. Do not add source article texts, tokens, or generation runs to Git.
- Validate what Sanity MCP tools are actually connected. If missing, explain exact local authentication steps; do not invent calls. Official setup: from `cms/studio`, `npx sanity@latest mcp configure` and OAuth sign-in. Never log tokens.
- **No Sanity publish calls, no live document mutations, no production changes** during implementation/testing. Draft creation only if I explicitly request a demo, and then use a harmless test draft. No automatic publishing.

## Stage A — Repository and CMS compatibility audit

1. Confirm the real article field contract, max lengths, slug validation, Portable Text allowable types, Sanity project/dataset selection, preview flow, Cloudflare Pages runtime, canonical, sitemap, RSS, topic filters and JSON-LD.
2. Produce a brief integration report noting what can be reused, gaps, and a migration plan. Make the minimum backward-compatible website changes required.
3. Use the existing Sanity model and website renderer, not a second competing blog platform.

## Stage B — Expand the taxonomy beyond four topics

This is critical: `onboarding`, `analytics`, `adoption`, `feedback` are the current category values, **not** the only allowed subjects. Add scalable categorization so editors can cover activation, retention/churn, segmentation, product-led growth, experimentation/CRO, SaaS growth, UX research, customer success, etc., and any future subject. Design two layers:

- `primaryCategory`: one stable reader-facing category per post, ideally a **Sanity-managed `blogCategory` document reference** with slug, title, description, order, and active status. Preserve current four categories and their slugs; migrate old posts safely. Use backward-compatible reads for existing documents with legacy `topic` string. Add safe migration script/report (dry-run default, idempotent). If a reference-based migration would disrupt current runtime, explain tradeoffs and implement a staged compatible alternative with tests.
- `topicTags`: flexible multi-tag terms/clusters independent of high-level categories; should not require frontend redeployment for each new tag. Avoid automatically creating a top-level category for every keyword.

Update Studio schema, queries, filter navigation, sitemap/RSS, structured data if needed, and checks. **Never delete or rewrite existing posts or change their public article slugs.** Until migration is complete, fail closed on new category publication; show a clear error rather than silently assigning an incorrect legacy topic. Choose a small useful set of top-level categories; do not create thin landing pages with no articles.

## Stage C — Build house-voice training (3 profiles, 20 references each)

Implement an ingestion tool that accepts one writer/reference URL at a time, validates URL, respects site robots and terms, rate-limits, records source metadata and permission status, extracts **high-level** rhetorical patterns, and stores only permitted local text in an ignored local `private-references/` folder. Manifests at `authors/{analyst,founder,practitioner}/references/manifest.csv` are 20 **empty slots**, not pre-collected samples. Use 15 references to derive the profile and 5 holdout samples to evaluate broad voice adherence. Preserve the selected author association in metadata. If downloading is restricted, store source URL/notes only; do not bypass access controls.

Implement profile evaluator that checks general pacing, structure, analytical/reflective/practical style, source use and clarity. Do not attempt a recognizable living writer impersonation, copy phrases, or assign the reference author's identity as byline. Three original house voices should remain distinct and persist across article runs. Provide commands to add, audit and refresh the profile.

## Stage D — Two research entrypoints

1. `reference URL + selected voice` mode: fetch permitted reference metadata, derive topic, investigate current SERP, related queries, question opportunities, competitor pages, search intent, content gap, evidence ledger and SEO relevance.
2. `discovery` mode: find unaddressed high-business-fit topics without a seed URL.

Avoid pseudo metrics. Use real keyword providers/Search Console only if credentials/providers actually exist; otherwise mark volume, difficulty, competitive ranking and conversions `unknown`. Prefer the ICP: 5–50-person SaaS teams with meaningful traffic, an activation/checkout drop-off, and no dedicated analyst/researcher. Detect near-duplicate intent against published Sanity content (including canonical and titles) before drafting; suggest update/merge instead of redundant new articles.

Research outputs: structured `research.json`, source ledger with dates/URLs, a ranked brief proposal showing ICP fit and unique contribution.

## Stage E — Per-article pipeline

Build a small orchestrator/CLI leveraging Codex project skills and deterministic scripts, **not** six parallel paid model agents by default. Stage boundaries must persist to `runs/<slug>` and be independently restartable:

1. Research → brief proposal.
2. Brief human review (topic, angle, factual outline, tags, CTA, target query).
3. Write original article using selected house voice; never paraphrase reference article.
4. Independent claim/source and Movcues product fact verification.
5. Independent SEO, AEO, GEO and editorial revision.
6. Deterministic validation and browser preview technical QA.
7. Create Sanity draft via MCP, validate actual Portable Text against schema, inspect preview.
8. Request explicit, exact-revision human approval (approval record cannot be fabricated by agent).
9. Publish via Sanity MCP **only on a separate direct user instruction** after checking the same revision and complete QA gate evidence. Record returned actual Sanity ID and URL. Default mode must NEVER publish.

Each retry should repair a specific issue and have max 2 attempts; then escalate. Separate mutable writing artifact, immutable evidence, QA report, approval and audit trail. All scripts should be idempotent where practical, with dry-run default for any mutation.

## Stage F — Quality control

Read `config/quality-gates.json` and the existing `scripts/validate-article.mjs`. Extend the validator with: URL safety/availability, valid canonical, nonempty meaningful sections, no unsupported primary research claims, author byline verification, title/slug/summary limits, heading structure, broken internal links, image license and alt, original angle, real CMS schema validation, correct topic/tag migration, legal/copyright review, generated Portable Text shape, schema.org Article metadata, RSS/sitemap/robot rendering, mobile browser preview, keyboard and a11y checks. Use actual browser and actual CMS schema rather than merely model self-assessment. No unsupported Google-specific hacks.

Explicitly distinguish automated checks from human/independent editorial reviews. Gate failures block publishing. Fingerprint the exact content, and invalidate QA/approval on revision. Build adversarial test cases: malicious URL, invalid slug, a new category not yet migrated, citation pointing to missing source, invented statistic, dead link, plagiarized excerpt, unsupported Movcues feature, missing alt text, failed MCP, duplicated topic, preview robots/noindex or canonical bug, altered revision after approval, and approval without human action. Don't hard-code word counts or keyword densities as quality proxies.

Run existing repository test suites as relevant, plus independent new tests. Keep main website and dashboard behavior unchanged. Explain any test you cannot execute and why.

## Stage G — Sanity adapter and handover

Implement a mapping from internal normalized article to `blogPost` Portable Text using the exact current schema (including callout/code blocks/images when supported), and use existing Studio preview action. Never invent fields without updating Studio, dataset schema, queries, renderer and tests together.

Create a short operator guide showing: (a) add author references one by one, (b) train/refine voice, (c) submit URL and select voice, (d) inspect brief, (e) run QA, (f) create draft, (g) preview, (h) explicitly approve and publish, (i) measure post-performance. List prerequisites (Node, authenticated Sanity MCP, optional keyword source, optional Search Console). Do not imply other API integrations exist unless verified.

## Acceptance criteria

- 3 independently configurable house voices with 20-slot manifests each; reference bodies remain uncommitted.
- Research-first workflows for URL mode and discover mode, with source provenance and explicit unknowns.
- Dynamic category/tags design supports topics beyond 4 while preserving old articles and slugs; regression tests.
- Deterministic preflight + editorial QA evidence, rejection/retry handling, and exact-revision approval gates.
- Sanity drafts and real browser previews support the actual website rendering, without website payload bloat.
- No live publication during development, no unauthorized secret exposure, no ignored baseline test failures, no breaking changes to old blog URLs.
- A final report listing files changed, migration actions, tests run/results, remaining manual setup, and exactly how I can run it locally.

First inspect, then implement end to end. Avoid unnecessary clarification if repository sources already settle decisions. If blocked by credentials, complete non-secret local development and report the exact blocking integration instead of pretending it works.

---
name: movcues-content-pipeline
description: Research, plan, write, independently QA and draft original Movcues blog articles in Sanity using the local Movcues Content Engine. Support 3 reusable house voices, reference URLs and discover-mode. Never auto-publish.
---

# Movcues Content Pipeline

This is a project-local Codex skill. Its source of truth is `tools/content-engine/` at the same repository root.

1. Read `tools/content-engine/README.md`, `WORKFLOW.md`, `POLICIES.md`, `config/engine.json`, `config/taxonomy.json`, and `config/quality-gates.json` before starting article work.
2. If implementation is incomplete, read `tools/content-engine/CODEX_IMPLEMENTATION_PROMPT.md` and build the integration on an isolated branch. Do not pretend executable subcommands or connected data providers exist yet.
3. For each reference URL, start with research and a reviewable brief. Never simply paraphrase the article. If no reference URL, use discovery mode.
4. Select one original Movcues house voice from `tools/content-engine/authors/`. House voices are stylistic broad patterns, not impersonations. The actual Sanity byline must be a real, approved contributor.
5. Source claims, check existing Sanity published content, and make the article distinctive and helpful. Treat commercial keyword metrics as unavailable without an authorized source.
6. Use `node tools/content-engine/scripts/validate-article.mjs <article.json>` and the editor QA checklist; build/preview the real Cloudflare website before release.
7. The Sanity `blogPost` schema currently accepts only `onboarding`, `analytics`, `adoption`, `feedback`. **These are legacy schema restrictions, not editorial topic restrictions.** Expand taxonomy via migration before publishing newer categories; never silently remap a retention article into a misleading legacy category.
8. Create only a Sanity draft by default. Preview and obtain human approval of the exact version; publish only in response to a *separate explicit publish request*, with all independent QA passes, author approval, and version/fingerprint match. Never generate approval as the human.
9. Never commit scraped source article bodies, tokens, or private data, and never change the public website or dashboard unnecessarily.

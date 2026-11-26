# Movcues Content Engine (Codex implementation scaffold)

> Status: **Partial Codex-assisted workflow.** Local reference import, research compilation, staged run tracking, draft mapping and deterministic preflight exist. They do not provide autonomous research, independent review, a connected draft command, or publication. See `OPERATOR_GUIDE.md` for the current handoff and limitations.

## Correct placement in Loopz-Frontend

Extract this ZIP into the **repository root**. It creates:

- `tools/content-engine/` — research briefs, house-style profiles, local QA scripts, editorial policies, run artifacts.
- `.agents/skills/movcues-content-pipeline/SKILL.md` — Codex discoverable entrypoint. Codex loads project skills from `.agents/skills`.

Do **not** install this under `apps/website/src`, `apps/dashboard`, `cms/studio`, or `public`. The engine is not a runtime dependency or website asset.

### Verified repository integration points (main, inspected 2026-11-21)

- `cms/studio/blogPost.ts` is the actual Sanity `blogPost` document schema.
- `cms/studio/sanity.config.ts` registers the Studio schema.
- `apps/website/src/blog/config.mjs` defines `BLOG_TOPICS`, `/blog`, and article slug rules.
- `apps/website/src/blog/content.mjs`, `handler.mjs`, `render.mjs` implement article retrieval/rendering.
- `apps/website/test/blog.test.mjs` contains existing blog tests.
- `apps/website/scripts/build-blog-worker.mjs` assembles the Cloudflare runtime.
- Blog posts are served through Cloudflare Pages Functions and backed by Sanity, not static Astro markdown.

The four categories in the deployed production schema (`onboarding`, `analytics`, `adoption`, `feedback`) are **not** the target editorial taxonomy. Local Studio and website code contain a staged Sanity-managed category migration, but the deployed schema inspected on 2026-11-21 still requires a legacy topic. New categories must not be used for publication until compatible website and Studio changes are deployed and verified; preserve legacy slugs and article URLs during migration.

## Architecture

1. **Once per house voice:** collect up to 20 licensed/permitted reference articles and record evidence of their performance (not just popularity). Extract high-level patterns into `authors/{voice}/voice-profile.md`; reserve five references for evaluation. No source prose is reused.
2. **Per submitted URL:** research source article's topic, current SERP/search intent, first-party business fit, existing Movcues posts, opportunities, primary query, related questions, sources, and original angle.
3. **Content brief approval:** show topic + outline + target query + claims and verify enough originality to justify creating a new article.
4. **Write:** apply one of three *original Movcues house voices*; preserve evidentiary separation from writing style.
5. **Independent reviewers:** factual verification, originality, product claims, SEO, AEO/GEO, accessibility, schema, and browser preview. Targeted repairs; fixed retry budget.
6. **Draft via Sanity MCP:** map approved content to real `blogPost` Portable Text and render draft preview.
7. **Explicit human approval of exact revision:** only then allow Sanity publish; log document ID and published URL.
8. **Measure outcomes:** Search Console query impressions, clicks, conversion events, and manually sampled AI search citations. Never claim AI inclusion is guaranteed.

See `WORKFLOW.md`, `POLICIES.md`, `CODEX_IMPLEMENTATION_PROMPT.md`, and the repo skill.

## Start locally (Windows PowerShell)

```powershell
# From Loopz-Frontend repository root
node --test tools/content-engine/tests/validate-article.test.mjs
node tools/content-engine/scripts/validate-article.mjs tools/content-engine/examples/example-article.json

# In the existing Studio directory, configure authenticated Sanity MCP for Codex
cd cms/studio
npx sanity@latest mcp configure
```

The example article is deliberately **not publishable**; it demonstrates draft validation with fictitious placeholders and will report blockers. Tests use the Node.js standard library and do not make network requests.

## Codex workflow requests

- `$movcues-content-pipeline research https://example.com/reference --voice analyst`
- `$movcues-content-pipeline brief ...`
- `$movcues-content-pipeline draft ...`
- `$movcues-content-pipeline validate ...`
- `$movcues-content-pipeline sanity-draft ...`
- `$movcues-content-pipeline publish ...` — only after authenticated, explicit approval and final revision verification.

These are natural-language workflow examples, not implemented command-line subcommands. The skill requires a research brief and human approval; publication requires a separate explicit instruction. See the operator guide for the actual `runs.mjs` commands and their limitations.

## Practical restrictions

- No API keys, .env files, local downloaded article bodies, scraping cookies, personal data, or publication approvals in Git.
- Follow website robots.txt, terms of use, copyright, permissions and rate limits. Prefer using URLs + metadata; keep reference full text local and Git-ignored.
- Search volume, difficulty, traffic, author performance and ranking claims must have real sources or be marked unavailable.
- Use real author bylines, approved by the named person. Editorial voice profiles are NOT impersonation of the original writers.
- A QA checklist is not proof of a higher Google or AI search rank; track external outcomes after publishing.

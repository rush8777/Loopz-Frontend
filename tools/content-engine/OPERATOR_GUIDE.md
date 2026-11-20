# Operating the engine after Codex implementation

## 1 — Style training (once per voice)

Choose 20 high-quality, permission-compatible reference articles for one writer. Enter their URL, date, evidence, and author in the relevant `references/manifest.csv`. If performance is unknown, leave it unknown. Keep local downloaded reference bodies in the ignored private folder. Ask Codex to analyze 15 samples, generate the high-level house style, then evaluate on five held-out samples. Repeat separately for the three profiles.

## 2 — Give a URL and voice

Provide the reference URL and select `analyst`, `founder`, or `practitioner`. Codex researches *independently*: keyword clusters, search intent, content gaps, up-to-date facts and Movcues relevance. Ask to approve the brief before drafting.

## 3 — Review before drafting

Confirm the article is relevant, different from the reference and your existing published content, and has a useful unique contribution. Consider updating an existing post rather than creating a duplicate.

## 4 — Draft and review

Check author voice, factual evidence, natural keyword usage, direct answers, product facts, sources, links and clarity. Make corrections to the relevant section. Review quality-gate report for failed checks.

## 5 — Draft in Sanity

After automated and editorial validation, create a Sanity **draft** using the authenticated MCP. Open rendered preview from Studio. New categories may require a CMS/website migration first.

## 6 — Publish by a separate command

Look at the final exact draft. Explicitly authorize publication of that revision. Any editing after approval invalidates the approval. Codex should re-verify revision before publishing and then log the actual post URL and document ID.

## 7 — Measure

Gather real metrics from Search Console and product conversion analytics. Record query rankings, clicks, impressions, CTA engagement, signups and sampled AI mentions if data is available. Use this feedback to choose future topics; never mark unavailable figures as zero.

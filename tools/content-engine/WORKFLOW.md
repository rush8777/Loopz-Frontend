# Editorial workflow and contract

## Mode A: Reference URL (default)

Input: URL, selected `voice_id`, optional target audience, optional business objective, publish=false.

| Stage | Owner | Input | Durable output | Stop condition |
|---|---|---|---|---|
| 0. Intake | Coordinator | URL + voice | `runs/<slug>/request.json` | Inaccessible or forbidden reference; unclear intent |
| 1. SERP research | Research skill | URL, site content index | `research.json` with query evidence, competitor URLs, intent | No credible independent angle |
| 2. Strategy | Strategist | Research + ICP facts | `brief.md`, `brief.json` | Existing article cannibalization |
| 3. Draft | Writer | Brief + house voice | `article.json`, `draft.md` | Unsupported factual or Movcues claims |
| 4. Source / editorial QA | Reviewers | Sources + article | `qa-report.json` | Any blocker |
| 5. Technical QA | Validator + browser | Sanity schema + web preview | `technical-report.json` | Link, accessibility, metadata, schema error |
| 6. CMS draft | Sanity MCP | Valid normalized article | Sanity draft ID + preview URL | Schema/permissions mismatch |
| 7. Approval and publish | Human | Exact rendered draft | One explicit publish request approving the inspected revision | Not approved, content changed, or failed preflight |
| 9. Feedback | Analytics / Search Console | Published canonical | `performance.json` after metrics exist | No source data → mark unavailable |

## Mode B: Discover article ideas

Research searches and Movcues knowledge to produce ranked opportunities without requiring a reference URL. Rank by customer pain, query intent, evidence, differentiation, and conversion fit; estimate volume only if a tool provides it. The downstream brief→draft→validation flow is identical.

## Openings and accessible writing

- Lead with a specific situation, decision, or tension the intended reader will recognize. Show why it matters, offer a useful insight or question, and promise a concrete outcome the article delivers.
- Draft two or three distinct opening options and select for relevance, specificity, credibility, and a clear promise. Keep the opening concise and suited to search intent; do not force a statistic, trend, or question.
- Write for the stated audience. Assume nontechnical founders understand their business but may be new to product analytics. Explain the problem in everyday language before introducing methods or metrics.
- Use familiar words when accurate. Explain necessary technical terms on first use with a short example. Turn abstract methods into concrete questions, steps, and decisions.
- Distinguish observed facts, inferences, and clearly labeled hypothetical examples. Never invent customer experiences, author experience, quotes, or statistics. Check sources, dates, populations, definitions, and relevance before using a benchmark.
- In editorial QA, check whether the reader would recognize the situation, understand the opening and first action, and find the promised answer. Check that claims are supported and the opening is specific enough that it could not fit an unrelated article unchanged.

## Editorial checks

Perform evidence-backed fact, product, editorial and SEO checks; an independent human reviewer is optional. Do not represent a self-check as independent. Deterministic checks must run as scripts, and browser checks must inspect **rendered output**. Record unresolved issues and their evidence. One explicit request to publish the inspected revision counts as editorial approval; no separate author approval is required for an explicitly disclosed fictional or editorial byline.

## Failure/retry handling

- 2 targeted automatic repair attempts per issue, then escalate.
- Do not regenerate the whole article for one broken link or unsupported statistic.
- Any content change invalidates approval; re-run affected checks and approval as needed.
- Sanity `create draft` and `publish` are intentionally different tools and different permissions.
- Never treat an empty or unavailable competitor data result as proof that a topic is low-competition.

## Definition of done

A publication is done only when an explicit human approves the *same content version* displayed in preview; independent blockers are resolved; CMS and site validation pass; the public URL returns the expected content/canonical; and the published document ID, timestamp and checks are saved in an audit log. Do not perform actual publication during implementation/testing.

# Editorial workflow and contract

## Mode A: Reference URL (default)

Input: URL, selected `voice_id`, optional target audience, optional business objective, publish=false.

| Stage | Owner | Input | Durable output | Stop condition |
|---|---|---|---|---|
| 0. Intake | Coordinator | URL + voice | `runs/<slug>/request.json` | Inaccessible or forbidden reference; unclear intent |
| 1. SERP research | Research skill | URL, site content index | `research.json` with query evidence, competitor URLs, intent | No credible independent angle |
| 2. Strategy | Strategist | Research + ICP facts | `brief.md`, `brief.json` | Existing article cannibalization, unapproved brief |
| 3. Draft | Writer | Approved brief + house voice | `article.json`, `draft.md` | Unsupported factual or Movcues claims |
| 4. Source / editorial QA | Reviewers | Sources + article | `qa-report.json` | Any blocker |
| 5. Technical QA | Validator + browser | Sanity schema + web preview | `technical-report.json` | Link, accessibility, metadata, schema error |
| 6. CMS draft | Sanity MCP | Valid normalized article | Sanity draft ID + preview URL | Schema/permissions mismatch |
| 7. Approval | Human | Exact rendered draft | Explicit approval tied to content fingerprint | Not approved or content changed |
| 8. Publish | Sanity MCP | Approved draft + fingerprint | Actual document ID and public URL | Any mismatch or failed preflight |
| 9. Feedback | Analytics / Search Console | Published canonical | `performance.json` after metrics exist | No source data → mark unavailable |

## Mode B: Discover article ideas

Research searches and Movcues knowledge to produce ranked opportunities without requiring a reference URL. Rank by customer pain, query intent, evidence, differentiation, and conversion fit; estimate volume only if a tool provides it. The downstream brief→draft→validation flow is identical.

## Independent reviewers

Have independent research/fact-check and editorial/SEO passes. One AI asserting it has passed its own fact checks does not count. Deterministic checks must run as scripts, and browser checks must inspect **rendered output**. QA should produce issue IDs, evidence, remediation owner, and blocker severity, not a fabricated 100-point score.

## Failure/retry handling

- 2 targeted automatic repair attempts per issue, then escalate.
- Do not regenerate the whole article for one broken link or unsupported statistic.
- Any content change invalidates approval; re-run affected checks and approval as needed.
- Sanity `create draft` and `publish` are intentionally different tools and different permissions.
- Never treat an empty or unavailable competitor data result as proof that a topic is low-competition.

## Definition of done

A publication is done only when an explicit human approves the *same content version* displayed in preview; independent blockers are resolved; CMS and site validation pass; the public URL returns the expected content/canonical; and the published document ID, timestamp and checks are saved in an audit log. Do not perform actual publication during implementation/testing.

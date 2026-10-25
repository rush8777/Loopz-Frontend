# Dashboard documentation screenshots

## Delivered batch (2026-10-22)

- **39 authentic dashboard captures**, integrated as **50 figures across 35 dashboard articles** on `docs/dashboard-screenshots`.
- WebP masters total **1,005,988 bytes** (about 1 MB), down **66.4%** from the accepted source JPEGs. The largest is 58,482 bytes.
- Captured from the signed-in **Demo / Demo Site** workspace using the cloud browser on 2026-10-21. Actual source sizes are recorded per image; no assumed viewport dimensions are reported as measurements.
- Original JPEGs remain outside the repository. Only reviewed WebP assets, documentation figure references, the docs-only image component, and this inventory/optimizer are committed.
- Existing article prose, SDK articles, navigation, branded styles, package files, and application code are preserved. `main` is unchanged.

## Capture authenticity and data

The canonical dashboard is `https://dash.movcues.com`. After the user completed supported sign-in, captures used the existing demo workspace. No authentication records, passwords, OAuth identities, browser tokens, or database records were edited to obtain access.

Synthetic product activity was sent through the supported public analytics ingestion API: 16 identified demo users with `example.test` addresses, four documentation anonymous visitors, and events for signup, project creation, onboarding, dashboard visits, and feature exploration. Funnel results are computed by the running backend: 16 starters, 10 project creators, six completions, and 37.5% completion. These are illustrative documentation results, not evidence of a customer performance improvement.

Demo segments, a three-step funnel, a custom dashboard, and experience examples were created through the real dashboard. The published guide uses manual-only launch and a synthetic audience. The demo survey uses a synthetic audience, Projects page, and event trigger. Other captured widget/checklist examples remain drafts. No paid subscription was purchased. Screenshots exclude account email, invitation links, credentials, payment details, and real visitor records. Site/workspace IDs visible in settings are public context identifiers.

Images are genuine product UI. Cropping removes unrelated canvas, obscuring panels, unused space, and navigation where it does not help the instruction. No UI, numbers, or results were painted into screenshots. The selected Typography, button interaction, Questions, launch settings, publishing forms, modal, banner, and slideout have focused crops so important controls remain readable. Larger views retain context where the relationship between controls matters.

## Coverage and limitations

`inventory.json` retains the original 56 planned entries plus the captured publication confirmation. It records accepted captures, reused coverage, rejected images, and missing views separately. Each accepted entry includes actual source/output dimensions, crop coordinates, file bytes, alt text, caption, source provenance, article mappings, and review flags.

Five articles retain their original text without screenshots:

- Experience performance: Experience Overview was not captured; a custom product dashboard is not an equivalent view.
- Inspect sessions: no verified session timeline capture.
- Preview and select targets: no verified live target-selection capture.
- Survey results and respondents: no completed survey response capture; no invented responses.
- Website themes: controls were unavailable in the deployed demo dashboard.

Toast and anchored-card captures were rejected because the editor palette obscured the message. They are not published. The widgets article uses the reviewed banner, modal, and slideout instead. No hotspot or cursor-follower screenshot is claimed. Workflow editors, heatmaps, session replay, and legacy pattern-analysis screens remain excluded by the original source audit.

The existing `dashboard-article-manifest.json` and `dashboard-documentation-audit.md` are unchanged historical source audits. Their original screenshot-unavailable findings describe article authoring, not the later capture batch; this inventory is the current image record.

## Responsive images and accessibility

`apps/website/src/components/docs/DocScreenshot.astro` uses Astro's supported `Image` pipeline. Imported masters generate responsive widths at build time without adding runtime JavaScript. Intrinsic dimensions reserve space; every figure has descriptive alt text, a factual visible caption, lazy loading, asynchronous decoding, and keyboard-accessible access to the full-size master. Full-size access lets mobile readers inspect small controls. Figure borders and captions use existing docs theme tokens; captured product UI retains its original colors.

Existing HTML headings, article copy, descriptions, canonical URLs, sidebar navigation, and sitemap URLs remain crawlable. Screenshots supplement the instructions rather than replacing them. No performance score, production indexing result, or Core Web Vitals improvement is claimed.

## Reproduce optimization

Requires Pillow in the tooling environment; no website dependency was added.

```sh
python docs/dashboard-screenshots/optimize.py --captures /absolute/path/to/cloud-captures --no-variants
python docs/dashboard-screenshots/optimize.py --check
npm run build:website
npm run check:website
```

To reprocess a capture, provide its original JPEG outside the repository and change only its inventory status to `captured`. Confirm authenticity, synthetic-only content, and sensitive-data review before running the optimizer. `crop` contains `[left, top, right, bottom]` in source pixels and must fit inside the image. The optimizer strips metadata, caps width at 1440 without upscaling, and writes quality-92 WebP atomically. `--no-variants` delegates responsive variants to Astro; do not commit redundant variant sets. `--lossless` is available if a later capture requires it for text clarity. Inspect the output before marking readability/integration complete.

## Verification

- Production website build passed: **86 pages**, including **59 documentation pages**; **4,806 internal links and anchors** passed the existing checker.
- Astro check passed: **68 files**, **0 errors, warnings, or hints**.
- All 50 generated figure instances verified for actual image/full-size/srcset file existence, intrinsic dimensions, alt text, captions, responsive sizes, lazy loading, and asynchronous decoding.
- All 35 illustrated article canonical URLs/descriptions/headings and all 40 dashboard article sitemap URLs verified.
- Original article prose compared against base commit `ef9808b568df2de652e3cfce9252512e56043d97`; only screenshot imports/figures and surrounding whitespace were added. All 24 other documentation files, including SDK articles, remain byte-identical.
- Optimized images reviewed at native size and through contact sheets; crops corrected where chart labels or relevant controls needed more space.
- A browser-level visual review of the finished docs in both themes/mobile widths and Core Web Vitals measurement was **not performed**. Corresponding `lightAndDarkThemeReview` flags remain false; build/HTML checks are not reported as browser visual QA.

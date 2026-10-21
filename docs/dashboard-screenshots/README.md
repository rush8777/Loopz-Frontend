# Dashboard documentation screenshot inventory

Status: **capture blocked by authentication**. No dashboard screenshots have been captured or added to public articles. This directory prepares the source mapping and optimizer; it is not evidence that screenshot collection or visual QA is complete.

## Source and deployment findings

- Work branch: `docs/dashboard-screenshots`, based on `chore/consolidate-docs` at `ef9808b568df2de652e3cfce9252512e56043d97`.
- The maintained Astro/Starlight app is **`apps/website`**, not the older `apps/docs` folder. Assets belong under `apps/website/src/assets/dashboard/`; articles are under `apps/website/src/content/docs/docs/`.
- Reviewed the recent consolidation, docs design, installation, sidebar, SDK revert, and dashboard-guide commits. The existing article manifest and audit retain the precise source evidence and known limitations.
- The requested `https://dashboard.movcues.com/` returned an upstream connection failure in the cloud browser, including after one reload. The real dashboard address configured by `apps/website/src/config/site.ts` and the docs header is **`https://dash.movcues.com`**. Its login form loads.
- No authenticated session was present. The secure sign-in request timed out; navigating back to the canonical dashboard still showed the login page. No successful login is claimed.
- No isolated database connector or configured database connection is available in this environment. No database writes were attempted. `https://api.movcues.com/health` returned `200` and `{"ok":true}`; this proves reachability only, not permission to access a database.
- The backend's current `src/routes/auth.ts` was also checked through GitHub (`85cce4f100e7fda87e75a07088403c756f63791f` blob). Email/password signup and Google authentication are supported. There is no demo-login route.

## Legitimate account setup

The supported `POST /auth/signup` flow creates a user and session. It does not create a workspace. `POST /auth/onboarding` validates workspace/site/domain input, creates an organization, its `OWNER` membership, a site with a generated public ID, and a Growth trial. The UI has an optional installation skip; `POST /auth/onboarding/skip` requires an existing membership and marks that organization onboarded. These are documented source findings, not actions performed during this task.

Dashboard authentication (`users`, `memberships`, `organizations`, `user_auth_identities`) and the tracked product-user analytics identities are separate namespaces. Creating an analytics user cannot provide dashboard login. Password hashes and OAuth identities must never be altered to make captures work.

To resume, complete the supported signup/sign-in in the cloud browser with a dedicated documentation demo identity. Use only its own workspace/site and synthetic records. The secure browser authentication flow collects existing sign-in credentials; new-account creation requires the user to complete the signup. No credentials, refresh tokens, invitation URLs, or private customer data belong in this repository or inventory.

## Capture coverage

`inventory.json` maps **56 planned captures to all 40 frontend/dashboard articles**. Entries contain the intended filename, asset location, article URLs/source paths, frontend source evidence, feature, and navigation. Dynamic route placeholders identify route patterns only; resolve actual IDs through the signed-in UI. Settings are modal navigation paths, not invented URLs. Website theme capture is conditional on its presence in the deployed product.

Each entry starts with no actual alt text, image metrics, provenance, or verification. Fill those fields only after observing the capture. The dashboard article manifest remains unchanged; it correctly states that live screenshots were not available when the articles were authored.

No dedicated documentation screenshots exist in the current repository. Marketing graphics and the dashboard onboarding illustrations are not current authenticated dashboard captures and have not been reused as such. Workflow editors, heatmaps, session replay, and legacy pattern-analysis pages are excluded because source routing/navigation does not establish them as available features.

## Capture and optimize

1. Use the cloud browser, preferably at 1440 × 900. Record actual screenshot dimensions if that viewport is unavailable. Capture finished UI with navigation context and synthetic records only. Avoid any page containing keys, tokens, invitation links, payment details, or real personal information.
2. Store original browser PNGs in a separate cloud capture directory **outside the git repository**. Do not manufacture images from rendered source, screenshot a mocked dashboard, intercept API responses to invent results, or seed a production database directly. Record `captureSource: "cloud-browser"`, capture timestamp, and the relative `originalFile` in the inventory.
3. Review each original for authenticity, synthetic-only data, and sensitive information. Then mark the three corresponding verification fields true and `status: "captured"`. Write alt text and optional caption describing the actual UI shown. Do not include imaginary events or example totals in alt text.
4. Run `python docs/dashboard-screenshots/optimize.py --captures /absolute/path/to/cloud-captures`. The script needs Pillow in the cloud Python environment. It creates metadata-free WebP at quality 92, caps the master at 1440 pixels without upscaling, and creates 720/1080 variants where appropriate. Use `--lossless` if text clarity needs it. Existing `captured` entries can be reprocessed after restoring that status; no authentication or application code is touched.
5. Inspect the outputs at normal and mobile viewing sizes. Prefer legibility over file-size targets. Review captures larger than 250 KB; smaller crops should generally be 50–100 KB. Optimizer completion does not automatically approve readability or publication.

## Integrate only completed captures

Import each optimized image in the relevant MDX article with `Image` from `astro:assets`. Give it descriptive alt text, intrinsic dimensions, responsive sizing, `decoding="async"`, and `loading="lazy"` below the fold. Use the generated width variants with native `srcset` or let Astro generate variants from the imported master; do not serve both variant sets redundantly. Keep full-resolution access available for fine UI text on mobile. Place the image beside the exact steps it explains and add a short factual caption when helpful.

Preserve existing article prose, SDK pages, branded styles, heading hierarchy, and navigation. Do not add placeholder image references to pages while captures are missing. Check both docs themes with real rendered images before marking `lightAndDarkThemeReview` true. Mark `integrated` only after visual review and successful build/path verification; update the summary counts accordingly.

## Crawlability and QA

- `site` is already `https://movcues.com`; Starlight supplies its sitemap integration when no explicit sitemap integration is present. The current app's `robots.txt` allows crawling. No new SEO dependency or custom image sitemap is required.
- Verify generated documentation URLs in the built sitemap, descriptive titles/descriptions, canonical URLs, and image URLs after integration. Preview crawlers may behave differently from production; no production indexing claim is made.
- `python docs/dashboard-screenshots/optimize.py --check` validates article mappings, filenames, asset boundaries, and actual optimized image sizes/formats when assets exist. It reports pending captures honestly.
- Run `npm run build:website` and `npm run check:website` after image integration. Review rendered desktop/mobile pages, loading behavior, theme contrast, and reserved image space. A successful build alone does not verify screenshot quality or Core Web Vitals.
- Commit only completed documentation image assets, relevant article image references, and these supporting files. Leave SDK/application code and `main` untouched.

## Preparation verification (2026-10-21)

- Inventory validation passed: 56 planned screenshots map to all 40 dashboard articles; 0 captures and 0 image integrations are claimed.
- `npm run build:website` passed: 86 generated pages; 59 documentation pages and 4,756 internal links/anchors checked.
- `npm run check:website` passed: 0 errors, warnings, or hints across 67 files.
- All 40 dashboard article URLs appear in the generated sitemap.
- Existing SDK/dashboard MDX, application source, website styles/configuration, and package files are unchanged from the base commit. No live screenshot rendering, image quality, responsive-image loading, or performance score has been verified yet.

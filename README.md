# movcues frontend workspace

This repository is an npm workspace containing the movcues dashboard and its shared design-system packages.

## Structure

```text
apps/
  dashboard/       Existing Vite dashboard application
  website/         Static Astro marketing website
packages/
  tokens/          Shared brand CSS variables, fonts, radii, and shadows
  ui/              Shared React UI primitives
```

Dashboard-only features—including analytics views, authentication, navigation, GrapesJS, experience builders, SDK configuration, and live preview—remain in `apps/dashboard`.

## Commands

Install all workspace dependencies from this directory:

```bash
npm install
```

Run the dashboard:

```bash
npm run dev:dashboard
```

Run and build the marketing website independently:

```bash
npm run dev:website
npm run check:website
npm run build:website
```

Build, test, and lint the dashboard:

```bash
npm run build:dashboard
npm run test:dashboard
npm run lint:dashboard
```

Type-check every workspace package that defines a type-check script:

```bash
npm run typecheck
```

The equivalent npm workspace commands also work, for example:

```bash
npm run build --workspace=apps/dashboard
```

## Shared packages

Use shared primitives through their public entrypoint:

```tsx
import { Button, Dialog, Input } from "@movcues/ui";
```

Applications load the shared brand tokens once at their entrypoint:

```ts
import "@movcues/tokens/styles.css";
```

Both packages are private workspace dependencies and are not published to npm.

## Deployment layout

For the dashboard Cloudflare project, use the repository root as the build context, `npm run build:dashboard` as the build command, and `apps/dashboard/dist` as the output directory.

Configure `VITE_API_URL` as a Cloudflare Pages build-time variable for the Production environment (for example, `https://api.movcues.com`). Vite embeds `VITE_*` values into the static dashboard bundle during the build, so changing the variable requires a new deployment. Local `.env` files are intentionally ignored and must not be committed.

For the public website Cloudflare project, use the same repository root, `npm run build:website`, and `apps/website/dist`. The website is a static Astro build and is deployed separately from the dashboard.

## Blog publishing

The website serves the blog at `/blog`. The existing Astro build produces its page layout, navigation, and assets. Cloudflare Pages Functions render the article list, article pages, RSS, and blog sitemap from Sanity on request. The dashboard project keeps its own build and settings.

### One-time setup

1. Create a Sanity project for the blog. A public production dataset works with the free plan. To use a private dataset, add a Viewer API token as the Pages secret `SANITY_READ_TOKEN`.
2. In `cms/studio`, copy `.env.example` to `.env`, fill in the project ID, and make sure the dataset and blog origin match the target environment. Run `npm ci` and `npm run dev` to open the editor locally, or `npm run deploy` to host Studio on Sanity. Run `npx sanity schema deploy` from this directory to make the blog schema available to agents.
3. In the **website** Cloudflare Pages project, set `SANITY_PROJECT_ID` and `SANITY_DATASET` as runtime variables. To enable the Studio action **Preview blog article**, create a Sanity Viewer API token and add it to Pages as the secret `SANITY_PREVIEW_TOKEN`. Use the repository root as the Pages build root, `npm run build:website` as the build command, and `apps/website/dist` as the output directory so Pages deploys the generated `_worker.js` for the website. The dashboard build does not include this Worker. Redeploy once after configuring these settings.
4. After launch, submit `https://movcues.com/blog-sitemap.xml` in Search Console and check that an article's complete HTML and canonical URL are visible in URL Inspection.

### Publish from Studio or a local agent

In Studio, open **Article**, enter the title, URL slug, summary, author, topic, publication date, and body, and use **Preview blog article** to check the draft. Then publish. Leave the slug stable after publication. The cover, quick answer, and search-specific title and description are optional.

To use Codex from a local checkout, run `npx sanity mcp configure` from `cms/studio` and sign in to Sanity when prompted. Ask the agent to create or update a `blogPost` in the project and dataset you configured. The article body uses Portable Text. Use an explicit publish request when the draft is ready. Anonymous readers, the sitemap, and the feed see published versions only.

Public blog pages are cached for up to two minutes. Edits, publishes, and unpublishes use the same website deployment. If Sanity is temporarily unavailable, the website returns a retryable `503` for uncached blog pages. If no project is configured, the blog shows an empty listing.

### Preview the Cloudflare runtime locally

Build the website and start Pages from the repository root:

```sh
npm run build:website
npx wrangler@4.165.0 pages dev apps/website/dist --compatibility-date 2026-11-19
```

For a real content preview, put the runtime variables in a local `.dev.vars` at the repository root and set `SANITY_STUDIO_BLOG_ORIGIN` in Studio to the local Pages URL. The Studio preview opens in a separate tab. Astro's standalone preview shows the static blog shell.

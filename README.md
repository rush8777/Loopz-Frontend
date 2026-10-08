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

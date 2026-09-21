# Movecues frontend workspace

This repository is an npm workspace containing the Movecues dashboard and its shared design-system packages.

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
import { Button, Dialog, Input } from "@movecues/ui";
```

Applications load the shared brand tokens once at their entrypoint:

```ts
import "@movecues/tokens/styles.css";
```

Both packages are private workspace dependencies and are not published to npm.

## Deployment layout

For the dashboard Cloudflare project, use the repository root as the build context, `npm run build:dashboard` as the build command, and `apps/dashboard/dist` as the output directory.

For the public website Cloudflare project, use the same repository root, `npm run build:website`, and `apps/website/dist`. The website is a static Astro build and is deployed separately from the dashboard.

# Movcues SDK documentation

This is the standalone static documentation site for the Movcues JavaScript SDK.

## Local development

From the repository root:

```bash
npm install
npm run dev:docs
```

Run validation and create the static output with:

```bash
npm run check:docs
npm run build:docs
```

The production files are written to `apps/docs/dist`.

## Cloudflare Pages

Create a Cloudflare Pages project from this repository with the repository root as the build root. Use:

- Production branch: `main` after the docs branch has been reviewed and merged.
- Preview branch: `docs/sdk-documentation`.
- Build command: `npm ci && npm run build:docs`.
- Build output directory: `apps/docs/dist`.
- Node version: `22`.

After the first successful build, add `docs.movcues.com` as a custom domain in the Pages project and create the DNS record Cloudflare provides. The Astro `site` setting is already `https://docs.movcues.com`, which keeps canonical URLs and the generated sitemap on the final domain.

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://movcues.com",
  output: "static",
  integrations: [
    react(),
    starlight({
      title: "Movcues Docs",
      description: "Technical documentation for the Movcues JavaScript SDK.",
      favicon: "/favicon.svg",
      components: {
        Header: "./src/components/docs/DocsHeader.astro",
        SiteTitle: "./src/components/docs/DocsSiteTitle.astro",
      },
      customCss: ["./src/styles/docs.css"],
      sidebar: [
        { label: "Introduction", items: [{ label: "Build with Movcues", slug: "docs" }] },
        {
          label: "Getting started",
          collapsed: false,
          items: [
            { label: "Quickstart", slug: "docs/getting-started/quickstart" },
            { label: "Installation", slug: "docs/getting-started/installation" },
          ],
        },
        {
          label: "SDK References",
          collapsed: false,
          items: [
            {
              label: "Framework integrations",
              collapsed: true,
              items: [
                { label: "Vanilla JavaScript", slug: "docs/integrations/vanilla" },
                { label: "React", slug: "docs/integrations/react" },
                { label: "Next.js", slug: "docs/integrations/nextjs" },
                { label: "Single-page applications", slug: "docs/integrations/spa" },
              ],
            },
            {
              label: "Tracking & identity",
              collapsed: true,
              items: [
                { label: "Automatic collection", slug: "docs/tracking/automatic" },
                { label: "Custom events", slug: "docs/tracking/custom-events" },
                { label: "Identify users", slug: "docs/tracking/identify" },
                { label: "Page views", slug: "docs/tracking/pageviews" },
              ],
            },
            { label: "Configuration guide", slug: "docs/configuration" },
            { label: "Public API", slug: "docs/api" },
            { label: "Privacy controls", slug: "docs/privacy" },
            { label: "SDK troubleshooting", slug: "docs/troubleshooting" },
            {
              label: "API details",
              collapsed: true,
              items: [
                { label: "Configuration reference", slug: "docs/reference/configuration" },
                { label: "Event reference", slug: "docs/reference/events" },
                { label: "Release availability", slug: "docs/reference/availability" },
                { label: "Implementation audit", slug: "docs/reference/audit" },
              ],
            },
          ],
        },
      ],
    }),
  ],
});

import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.movcues.com",
  output: "static",
  integrations: [
    starlight({
      title: "Movcues Docs",
      description: "Technical documentation for the Movcues JavaScript SDK.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        { label: "Introduction", items: [{ label: "Build with Movcues", slug: "index" }] },
        {
          label: "Getting started",
          collapsed: false,
          items: [
            { label: "Quickstart", slug: "getting-started/quickstart" },
            { label: "CDN installation", slug: "getting-started/cdn" },
            { label: "ES module setup", slug: "getting-started/npm" },
            { label: "Verify your installation", slug: "getting-started/verify" }
          ]
        },
        {
          label: "Framework integrations",
          collapsed: true,
          items: [
            { label: "Vanilla JavaScript", slug: "integrations/vanilla" },
            { label: "React", slug: "integrations/react" },
            { label: "Next.js", slug: "integrations/nextjs" },
            { label: "Single-page applications", slug: "integrations/spa" }
          ]
        },
        {
          label: "Tracking & identity",
          collapsed: true,
          items: [
            { label: "Automatic collection", slug: "tracking/automatic" },
            { label: "Custom events", slug: "tracking/custom-events" },
            { label: "Identify users", slug: "tracking/identify" },
            { label: "Page views", slug: "tracking/pageviews" }
          ]
        },
        { label: "Configuration", items: [{ label: "Configuration guide", slug: "configuration" }] },
        { label: "API reference", items: [{ label: "Public API", slug: "api" }] },
        { label: "Privacy & security", items: [{ label: "Privacy controls", slug: "privacy" }] },
        { label: "Troubleshooting", items: [{ label: "Common issues", slug: "troubleshooting" }] },
        {
          label: "SDK reference",
          collapsed: true,
          items: [
            { label: "Configuration reference", slug: "reference/configuration" },
            { label: "Event reference", slug: "reference/events" },
            { label: "Release availability", slug: "reference/availability" },
            { label: "Implementation audit", slug: "reference/audit" }
          ]
        }
      ]
    })
  ]
});

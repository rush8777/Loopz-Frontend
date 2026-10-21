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
      description: "Learn to use the Movcues dashboard, build experiences, target audiences, and integrate the JavaScript SDK.",
      favicon: "/favicon.svg",
      components: {
        Header: "./src/components/docs/DocsHeader.astro",
        SiteTitle: "./src/components/docs/DocsSiteTitle.astro",
      },
      customCss: ["./src/styles/docs.css"],
      sidebar: [
        { label: "Introduction", items: [{ label: "Movcues documentation", slug: "docs" }] },
        {
          label: "Getting started", collapsed: false,
          items: [
            { label: "Start using Movcues", slug: "docs/getting-started/welcome" },
            { label: "Connect and verify your site", slug: "docs/getting-started/connect" },
            { label: "Build your first experience", slug: "docs/getting-started/first-experience" },
            { label: "Understand your first results", slug: "docs/getting-started/first-results" },
          ],
        },
        {
          label: "Guides & use cases", collapsed: true,
          items: [
            { label: "Improve onboarding", slug: "docs/guides/improve-activation" },
            { label: "Introduce a feature", slug: "docs/guides/feature-adoption" },
            { label: "Collect contextual feedback", slug: "docs/guides/collect-feedback" },
          ],
        },
        {
          label: "Dashboards & analytics", collapsed: true,
          items: [
            { label: "Experience performance", slug: "docs/analytics/overview" },
            { label: "Create and manage dashboards", slug: "docs/analytics/dashboards" },
            { label: "Configure analytics cards", slug: "docs/analytics/cards" },
            { label: "Metrics and retention", slug: "docs/analytics/metrics" },
            { label: "Filters and date ranges", slug: "docs/analytics/filters" },
          ],
        },
        {
          label: "People & segments", collapsed: true,
          items: [
            { label: "Users and activity", slug: "docs/people/users" },
            { label: "Create a segment", slug: "docs/segments/create" },
            { label: "Combine conditions", slug: "docs/segments/conditions" },
            { label: "Membership and management", slug: "docs/segments/membership" },
          ],
        },
        {
          label: "Observe & funnels", collapsed: true,
          items: [
            { label: "Pages and matching rules", slug: "docs/observe/pages" },
            { label: "Explore product events", slug: "docs/observe/events" },
            { label: "Inspect sessions", slug: "docs/observe/sessions" },
            { label: "Create an ordered funnel", slug: "docs/funnels/create" },
            { label: "Conversion and drop-off", slug: "docs/funnels/results" },
            { label: "Funnel result segments", slug: "docs/funnels/cohorts" },
          ],
        },
        {
          label: "Build experiences", collapsed: true,
          items: [
            { label: "Choose and manage experiences", slug: "docs/experiences/overview" },
            { label: "Content, layout, and buttons", slug: "docs/experiences/editor" },
            { label: "Multistep guides", slug: "docs/experiences/guides" },
            { label: "Contextual widgets", slug: "docs/experiences/widgets" },
            { label: "Preview and select targets", slug: "docs/experiences/preview" },
            { label: "Save, review, and publish", slug: "docs/experiences/publishing" },
            { label: "Create surveys", slug: "docs/experiences/surveys" },
            { label: "Survey results and respondents", slug: "docs/experiences/survey-results" },
            { label: "Onboarding checklists", slug: "docs/experiences/checklists" },
          ],
        },
        {
          label: "Targeting & launch", collapsed: true,
          items: [
            { label: "Audience and page targeting", slug: "docs/targeting/audience" },
            { label: "Launch triggers", slug: "docs/targeting/triggers" },
            { label: "Repeats, timing, and priority", slug: "docs/targeting/timing" },
          ],
        },
        {
          label: "Workspace & billing", collapsed: true,
          items: [
            { label: "Workspaces, sites, and account", slug: "docs/workspace/sites" },
            { label: "Team access and invitations", slug: "docs/workspace/team" },
            { label: "Plan, billing, and usage", slug: "docs/workspace/billing" },
            { label: "Website themes", slug: "docs/workspace/themes" },
          ],
        },
        {
          label: "Dashboard troubleshooting", collapsed: true,
          items: [
            { label: "Missing data and loading", slug: "docs/help/missing-data" },
            { label: "Experience delivery and publishing", slug: "docs/help/experience-delivery" },
          ],
        },
        {
          label: "SDK & developer documentation", collapsed: true,
          items: [
            { label: "SDK Quickstart", slug: "docs/getting-started/quickstart" },
            { label: "SDK Installation", slug: "docs/getting-started/installation" },
            {
              label: "Tracking & identity", collapsed: true,
              items: [
                { label: "Automatic collection", slug: "docs/tracking/automatic" },
                { label: "Custom events", slug: "docs/tracking/custom-events" },
                { label: "Identify users", slug: "docs/tracking/identify" },
                { label: "Page views", slug: "docs/tracking/pageviews" },
              ],
            },
            {
              label: "SDK References", collapsed: true,
              items: [
                {
                  label: "Framework integrations", collapsed: true,
                  items: [
                    { label: "Vanilla JavaScript", slug: "docs/integrations/vanilla" },
                    { label: "React", slug: "docs/integrations/react" },
                    { label: "Next.js", slug: "docs/integrations/nextjs" },
                    { label: "Single-page applications", slug: "docs/integrations/spa" },
                  ],
                },
                { label: "Configuration guide", slug: "docs/configuration" },
                { label: "Public API", slug: "docs/api" },
                { label: "Privacy controls", slug: "docs/privacy" },
                { label: "SDK troubleshooting", slug: "docs/troubleshooting" },
                {
                  label: "API details", collapsed: true,
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
        },
      ],
    }),
  ],
});

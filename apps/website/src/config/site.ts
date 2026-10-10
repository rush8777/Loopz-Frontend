export const SITE = {
  name: "Movcues",
  origin: "https://movcues.com",
  title: "Movcues — Turn user behavior into action",
  description:
    "Understand user behavior, find the right audience, deliver in-app experiences, and learn what moves users forward.",
} as const;

export const DASHBOARD_URLS = {
  login: "https://dash.movcues.com/login",
  signup: "https://dash.movcues.com/signup",
} as const;

const EXPLORE_NAV_ITEMS = [
  { label: "Platform", description: "See how the entire Movcues loop works", href: "/explore" },
  { label: "Analytics", description: "Events, funnels, sessions and product insights", href: "/explore/analytics" },
  { label: "In-app experiences", description: "Guides, surveys, banners, checklists and contextual experiences", href: "/explore/experiences" },
  { label: "Targeting & segments", description: "Find and reach the users who need attention", href: "/explore/targeting" },
] as const;

const PRODUCT_NAV_ITEMS = [
  { label: "Guides", description: "Create multi-step guidance for important user journeys", href: "/product/guide" },
  { label: "Modals", description: "Present focused messages at the right moment", href: "/product/modals" },
  { label: "Checklists", description: "Help users make progress through key tasks", href: "/product/checklists" },
  { label: "Tooltips", description: "Add contextual help directly in the product", href: "/product/tooltips" },
  { label: "Dashboards", description: "Track the product signals that matter", href: "/product/dashboards" },
] as const;

export const NAV_ITEMS = [
  {
    label: "Product",
    href: "/product/guide",
    description: "Everything you need to understand users and move them forward.",
    items: PRODUCT_NAV_ITEMS,
  },
  {
    label: "Explore",
    href: "/explore",
    description: "Explore how Movcues turns behavior into action.",
    items: EXPLORE_NAV_ITEMS,
  },
  {
    label: "Resources",
    href: "/resources",
    description: "Learn how to understand and influence the product journey.",
    items: [
      { label: "Blog", description: "Practical notes for product teams", href: "/resources/blog" },
      { label: "Guides", description: "Long-form, focused learning", href: "/resources/guides" },
      { label: "Templates", description: "Starting points for better experiences", href: "/resources/templates" },
      { label: "Documentation", description: "Technical setup and implementation", href: "/resources#documentation", external: true },
    ],
  },
] as const;

export type ProductChapter = {
  number: `0${1 | 2 | 3 | 4}`;
  id: "understand" | "target" | "engage" | "improve";
  label: string;
  title: string;
  description: string;
  detail: string;
};

export const PRODUCT_CHAPTERS: readonly ProductChapter[] = [
  {
    number: "01",
    id: "understand",
    label: "Understand",
    title: "See what users need.",
    description:
      "Understand how people move through your product, where they hesitate, and which behaviors lead them toward value.",
    detail:
      "Explore events, pages, sessions, funnels, and dashboards in one place.",
  },

  {
    number: "02",
    id: "target",
    label: "Target",
    title: "Find the users who need attention.",
    description:
      "Turn live product behavior into precise audiences based on what users did, skipped, or have yet to discover.",
    detail:
      "Build dynamic segments that evolve as user behavior changes.",
  },

  {
    number: "03",
    id: "engage",
    label: "Engage",
    title: "Guide them at the right moment.",
    description:
      "Deliver guides, surveys, and announcements when they are most relevant to each user's journey through your product.",
    detail:
      "Personalize experiences by audience, behavior, page, timing, and context.",
  },

  {
    number: "04",
    id: "improve",
    label: "Improve",
    title: "Learn what moves users forward.",
    description:
      "Measure how people respond, uncover what worked, and use every result to make the next experience more effective.",
    detail:
      "Track engagement, completion, responses, and experience performance.",
  },
] as const;

export const PLATFORM_GROUPS = [
  {
    label: "Guides",
    description: "Lead people through important product moments, one clear step at a time.",
    href: "/product/guide",
    mockup: "guide",
  },
  {
    label: "Surveys",
    description: "Ask for feedback in context, while the experience is still fresh.",
    href: "/explore/experiences#surveys",
    mockup: "survey",
  },
  {
    label: "Modals",
    description: "Make a focused announcement impossible to miss at the right moment.",
    href: "/product/modals",
    mockup: "modal",
  },
  {
    label: "Checklists",
    description: "Give every customer a simple, visible path to their next success.",
    href: "/product/checklists",
    mockup: "checklist",
  },
] as const;

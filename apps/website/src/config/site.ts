export const SITE = {
  name: "Movcues",
  origin: "https://movecues.com",
  title: "Movcues — Turn user behavior into action",
  description:
    "Understand user behavior, find the right audience, deliver in-app experiences, and learn what moves users forward.",
} as const;

export const DASHBOARD_URLS = {
  login: "https://localhost:5173/login",
  signup: "https://localhost:5173/signup",
} as const;

export const NAV_ITEMS = [
  {
    label: "Product",
    href: "/product",
    description: "Everything you need to understand users and move them forward.",
    items: [
      { label: "Platform overview", description: "See how the entire Movcues loop works", href: "/product" },
      { label: "Analytics", description: "Events, funnels, sessions and product insights", href: "/product/analytics" },
      { label: "In-app experiences", description: "Guides, surveys, banners, checklists and contextual experiences", href: "/product/experiences" },
      { label: "Targeting & segments", description: "Find and reach the users who need attention", href: "/product/targeting" },
    ],
  },
  {
    label: "Solutions",
    href: "/solutions/user-onboarding",
    description: "Use behavior to solve key product-growth problems.",
    items: [
      { label: "User onboarding & activation", description: "Help new users reach value", href: "/solutions/user-onboarding" },
      { label: "Feature adoption", description: "Drive adoption of important product capabilities", href: "/solutions/feature-adoption" },
      { label: "Reduce funnel drop-off", description: "Find friction and act on affected users", href: "/solutions/funnel-dropoff" },
      { label: "Product feedback", description: "Ask the right users at meaningful moments", href: "/solutions/product-feedback" },
    ],
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
    label: "Understand",
    items: ["Events", "Pages", "Sessions", "Funnels"],
  },
  {
    label: "Target",
    items: ["Users", "Segments"],
  },
  {
    label: "Engage",
    items: ["Guides", "Surveys", "Banners", "Checklists"],
  },
  {
    label: "Improve",
    items: ["Dashboards", "Experience analytics"],
  },
] as const;

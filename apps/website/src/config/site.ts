export const SITE = {
  name: "Movcues",
  origin: "https://localhost:5173",
  title: "Movcues — Turn user behavior into action",
  description:
    "Understand user behavior, find the right audience, deliver in-app experiences, and learn what moves users forward.",
} as const;

export const DASHBOARD_URLS = {
  login: "https://localhost:5173/login",
  signup: "https://localhost:5173/signup",
} as const;

export const NAV_ITEMS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#journey" },
  { label: "Platform", href: "#platform" },
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
      "Explore events, pages, sessions, funnels, and heatmaps in one place.",
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
    items: ["Events", "Pages", "Sessions", "Funnels", "Heatmaps"],
  },
  {
    label: "Target",
    items: ["Users", "Segments"],
  },
  {
    label: "Engage",
    items: ["Guides", "Surveys", "Banners"],
  },
  {
    label: "Improve",
    items: ["Dashboards", "Experience analytics"],
  },
] as const;
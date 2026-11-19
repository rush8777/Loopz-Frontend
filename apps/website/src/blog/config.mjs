export const BLOG_ORIGIN = "https://movcues.com";
export const BLOG_PATH = "/blog";
export const BLOG_SITEMAP_PATH = "/blog-sitemap.xml";
export const BLOG_TITLE = "Movcues Blog | Onboarding, analytics and adoption";
export const BLOG_DESCRIPTION =
  "Practical guides for SaaS teams on user onboarding, product analytics, feature adoption, and product feedback.";

export const BLOG_TOPICS = [
  { slug: "onboarding", title: "User onboarding", href: "/explore/user-onboarding", link: "Explore user onboarding" },
  { slug: "analytics", title: "Product analytics", href: "/explore/analytics", link: "Explore product analytics" },
  { slug: "adoption", title: "Feature adoption", href: "/explore/feature-adoption", link: "Explore feature adoption" },
  { slug: "feedback", title: "Product feedback", href: "/explore/product-feedback", link: "Explore product feedback" },
];

export const BLOG_PAGE_SIZE = 10;
export const RESERVED_BLOG_SLUGS = ["preview"];
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isArticleSlug(slug) {
  return typeof slug === "string" && slug.length <= 96
    && BLOG_SLUG_PATTERN.test(slug) && !RESERVED_BLOG_SLUGS.includes(slug);
}

export function blogListUrl(topic, page = 1) {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (page > 1) params.set("page", String(page));
  return BLOG_PATH + (params.size ? `?${params}` : "");
}

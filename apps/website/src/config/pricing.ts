export const PRICING_PLANS = [
  {
    name: "Starter",
    price: "$49",
    featured: false,
    description: "For small teams building their first connected product journey.",
    limits: ["5,000 monthly active users", "1 site", "3 team members", "5 published experiences"],
    features: ["Product analytics and funnels", "Basic segments and targeting", "Guides, surveys, checklists, and widgets", "Page-load triggers and experience analytics"],
  },
  {
    name: "Growth",
    price: "$129",
    featured: true,
    description: "For teams that need precise targeting, timing, and orchestration.",
    limits: ["15,000 monthly active users", "3 sites", "10 team members", "25 published experiences"],
    features: ["Everything in Starter", "Combined audiences and exclusions", "Custom-event triggers and scheduling", "Advanced frequency, progression, and priority controls"],
  },
  {
    name: "Scale",
    price: "$299",
    featured: false,
    description: "For larger product teams running more programs across more sites.",
    limits: ["50,000 monthly active users", "10 sites", "30 team members", "100 published experiences"],
    features: ["Everything in Growth", "30 dashboards", "200 segments", "50 funnels"],
  },
] as const;

export type ResourceEntry = { title: string; description: string; category: string; meta: string; href?: string; type?: string; group?: string };

export const articles: ResourceEntry[] = [
  { title: "What funnel drop-off hides", description: "Move from a conversion percentage to the users, context, and next action behind it.", category: "Funnel analysis", meta: "Editorial preview · 6 min" },
  { title: "Design onboarding around activation", description: "Define first value in behavior, then guide users according to their actual progress.", category: "User onboarding", meta: "Editorial preview · 8 min" },
  { title: "Better feature announcements start with an audience", description: "Why eligibility and prior behavior matter more than maximum reach.", category: "Product adoption", meta: "Editorial preview · 5 min" },
];

export const guides: ResourceEntry[] = [
  { title: "A practical guide to activation", description: "Map activation, find the break in the journey, and design guidance around progress.", category: "User onboarding", meta: "Guide outline" },
  { title: "Behavioral segmentation for product teams", description: "Turn events, properties, pages, and funnels into useful living audiences.", category: "Behavioral segmentation", meta: "Guide outline" },
  { title: "From funnel analysis to recovery", description: "Connect drop-off analysis with a targeted experience and measurable outcome.", category: "Funnel analysis", meta: "Guide outline" },
  { title: "Contextual product feedback", description: "Choose who to ask, when to ask, and how to interpret the result alongside behavior.", category: "Product feedback", meta: "Guide outline" },
];

export const templates: ResourceEntry[] = [
  { title: "Welcome flow", description: "Orient a new user and point to the first meaningful task.", category: "Onboarding", group: "onboarding", meta: "Guide" },
  { title: "Setup checklist", description: "Keep a multi-step setup journey visible until it is complete.", category: "Onboarding", group: "onboarding", meta: "Checklist" },
  { title: "Activation guide", description: "Help stalled users complete the action that signals first value.", category: "Onboarding", group: "onboarding", meta: "Guide" },
  { title: "Feature announcement", description: "Introduce a capability to an audience that can use it.", category: "Adoption", group: "adoption", meta: "Banner or modal" },
  { title: "Feature discovery tooltip", description: "Explain an important control beside the feature itself.", category: "Adoption", group: "adoption", meta: "Anchored guide" },
  { title: "New-feature guide", description: "Walk eligible users through a focused sequence of first-use steps.", category: "Adoption", group: "adoption", meta: "Guide" },
  { title: "Feature feedback", description: "Ask active users about a capability after repeated use.", category: "Feedback", group: "feedback", meta: "Survey" },
  { title: "Post-onboarding survey", description: "Learn what was clear or difficult after setup completion.", category: "Feedback", group: "feedback", meta: "Survey" },
  { title: "Satisfaction pulse", description: "Collect a short, timely signal from a defined audience.", category: "Feedback", group: "feedback", meta: "Survey" },
];

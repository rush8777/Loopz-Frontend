export type MarketingPage = {
  title: string;
  metaTitle: string;
  description: string;
  path: string;
  eyebrow: string;
  visual: string;
  secondaryLabel: string;
  workflow: { eyebrow?: string; title: string; description: string; steps: string[]; dark?: boolean };
  sections: Array<{ eyebrow: string; title: string; description: string; points: string[]; visual: string; tone?: "light" | "soft" | "dark" }>;
  related: Array<{ label: string; description: string; href: string }>;
  cta?: { title: string; description: string };
};

export const marketingPages = {
  product: {
    metaTitle: "Movcues product platform | Understand and act on user behavior",
    path: "/product",
    eyebrow: "The Movcues platform",
    title: "Understand what users need. Then move them forward.",
    description: "Movcues connects behavioral analytics, audiences, in-app experiences, and measurement so product teams can understand friction and act without stitching together separate tools.",
    visual: "platform",
    secondaryLabel: "Explore the platform",
    workflow: { eyebrow: "The product loop", title: "One signal keeps moving.", description: "Each result informs the next decision. Insight becomes an audience, an experience, and a measurable outcome.", steps: ["Understand", "Target", "Engage", "Improve"], dark: true },
    sections: [
      { eyebrow: "From signal to action", title: "Behavior becomes a useful next step.", description: "See the journey, isolate the users affected, and respond in the same system. The work stays connected from first observation to measured result.", points: ["Events, pages, sessions, funnels, and dashboards", "Users, properties, segments, and funnel cohorts", "Guides, surveys, banners, checklists, and results"], visual: "analytics", tone: "soft" },
      { eyebrow: "A connected workflow", title: "Find a problem. Reach the people living it.", description: "A funnel insight is more useful when you can turn its drop-off into a live audience and place relevant guidance in the moment it matters.", points: ["User behavior → dynamic segment", "Segment → contextual experience", "Experience → outcome and response"], visual: "targeting", tone: "light" },
    ],
    related: [{ label: "Analytics", description: "See where users move forward and where they stop.", href: "/product/analytics" }, { label: "In-app experiences", description: "Guide users with contextual product experiences.", href: "/product/experiences" }, { label: "Targeting & segments", description: "Reach the exact users who need attention.", href: "/product/targeting" }],
  },
  analytics: {
    metaTitle: "Product analytics that leads to action | Movcues",
    path: "/product/analytics",
    eyebrow: "Movcues analytics",
    title: "See where users move forward — and where they don't.",
    description: "Explore product journeys, find friction, inspect the users affected, and turn the finding into a precise audience you can help.",
    visual: "analytics",
    secondaryLabel: "See the workflow",
    workflow: { title: "Analytics should lead somewhere.", description: "Movcues continues past the chart so teams can move from a pattern to the people behind it.", steps: ["Find a problem", "Identify affected users", "Create a segment", "Act and measure"] },
    sections: [
      { eyebrow: "Understand the journey", title: "Read behavior at product depth.", description: "Use events, pages, sessions, funnels, user activity, and dashboards to understand what happened before a user moved forward or stopped.", points: ["Define meaningful funnel steps", "Compare conversion across the journey", "Inspect user and session context"], visual: "platform", tone: "soft" },
      { eyebrow: "Friction to audience", title: "The users behind a percentage are the point.", description: "Turn funnel completion or drop-off into a segment, combine it with user properties or behavior, then reach that exact group with relevant guidance.", points: ["Build from a saved funnel cohort", "Refine with events, pages, and properties", "Measure experience engagement and completion"], visual: "targeting", tone: "dark" },
    ],
    related: [{ label: "Reduce funnel drop-off", description: "A complete workflow for finding and recovering friction.", href: "/solutions/funnel-dropoff" }, { label: "Targeting & segments", description: "Build an audience from what users did or missed.", href: "/product/targeting" }, { label: "Feature adoption", description: "Measure use before and after contextual guidance.", href: "/solutions/feature-adoption" }],
  },
  experiences: {
    metaTitle: "Contextual in-app experiences | Movcues",
    path: "/product/experiences",
    eyebrow: "In-app experiences",
    title: "Guide users in the moments that matter.",
    description: "Create guides, anchored tips, modals, surveys, banners, and checklists around real user behavior — then learn what changed.",
    visual: "experiences",
    secondaryLabel: "Explore experience types",
    workflow: { title: "Build for a moment, not a broadcast.", description: "Connect the experience to its audience, product location, trigger, and active window before you publish.", steps: ["Build visually", "Choose audience", "Set page and trigger", "Measure response"], dark: true },
    sections: [
      { eyebrow: "Build visually", title: "Shape the experience around the task.", description: "Create multi-step guides with modal or anchored steps, focused banners and announcements, persistent checklists, and contextual surveys in a visual editor.", points: ["Guides with button, element, event, or route progression", "Anchored cards, modals, banners, and surveys", "Checklist tasks linked to pages, guides, or segments"], visual: "experiences", tone: "light" },
      { eyebrow: "Deliver contextually", title: "Control who sees what — and when.", description: "Choose a segment, match the right page, trigger from a page view or custom event, set frequency, and schedule the active window.", points: ["Page and audience targeting", "Behavioral and manual triggers", "Frequency, priority, and scheduling controls"], visual: "targeting", tone: "soft" },
      { eyebrow: "Measure the result", title: "Learn from each experience you ship.", description: "Follow reach, starts, completion, dismissal, survey responses, checklist progress, and step-level guide drop-off.", points: ["Completion and engagement trends", "Survey response distribution and comments", "Guide steps and checklist task performance"], visual: "survey", tone: "dark" },
    ],
    related: [{ label: "User onboarding", description: "Guide new users toward their first success.", href: "/solutions/user-onboarding" }, { label: "Product feedback", description: "Ask relevant users at a meaningful moment.", href: "/solutions/product-feedback" }, { label: "Templates", description: "Start from a focused experience pattern.", href: "/resources/templates" }],
  },
  targeting: {
    metaTitle: "Behavioral targeting and dynamic segments | Movcues",
    path: "/product/targeting",
    eyebrow: "Targeting & segments",
    title: "Reach the users who actually need the experience.",
    description: "Build living audiences from user properties, product behavior, pages, funnel progress, and survey responses — then use them to deliver relevant experiences.",
    visual: "targeting",
    secondaryLabel: "See an audience example",
    workflow: { title: "Behavior becomes a relevant experience.", description: "Segments keep the connection between what a user did and what the product should show next.", steps: ["Behavior", "Dynamic audience", "Contextual experience"], dark: true },
    sections: [
      { eyebrow: "Audience logic", title: "Describe the people, not a static list.", description: "Combine events, user properties, page visits, funnel cohorts, and survey responses with nested matching logic.", points: ["Users who signed up and reached onboarding", "Users who stopped before setup completion", "Users who have not used an important feature"], visual: "targeting", tone: "soft" },
      { eyebrow: "Delivery context", title: "Eligibility is only part of the moment.", description: "Layer audience rules with page matching, behavior triggers, frequency, scheduling, and experience priority so guidance arrives with context.", points: ["Target matching product pages", "Trigger on page load or a custom event", "Set active windows and repeat behavior"], visual: "experiences", tone: "light" },
    ],
    related: [{ label: "User onboarding", description: "Segment new users by activation progress.", href: "/solutions/user-onboarding" }, { label: "Feature adoption", description: "Find eligible users who have not adopted a feature.", href: "/solutions/feature-adoption" }, { label: "Analytics", description: "Start an audience from behavioral evidence.", href: "/product/analytics" }],
  },
  onboarding: {
    metaTitle: "User onboarding and activation | Movcues",
    path: "/solutions/user-onboarding",
    eyebrow: "User onboarding & activation",
    title: "Help new users reach value faster.",
    description: "Understand where new users stop, define the behavior that signals value, and guide each person from sign-up to first success.",
    visual: "onboarding",
    secondaryLabel: "See the activation journey",
    workflow: { title: "Make activation a visible journey.", description: "Define the progress that matters, segment users by where they are, and guide the next useful action.", steps: ["Sign up", "Create project", "Configure setup", "First success"] },
    sections: [
      { eyebrow: "Understand progress", title: "Define activation in product behavior.", description: "Build the journey around meaningful events and funnel steps. See which step loses new users, then inspect the group affected.", points: ["Measure the path to first value", "Create cohorts from funnel progress", "Separate stalled users from active users"], visual: "analytics", tone: "soft" },
      { eyebrow: "Guide the next step", title: "Onboarding changes as progress changes.", description: "Use a welcome guide, anchored tip, setup checklist, or reminder banner according to where each user is in the journey.", points: ["Contextual guidance instead of one generic tour", "Persistent checklists for multi-step setup", "Measure activation after exposure"], visual: "experiences", tone: "dark" },
    ],
    related: [{ label: "Targeting & segments", description: "Build audiences from activation progress.", href: "/product/targeting" }, { label: "In-app experiences", description: "Choose the right format for each onboarding moment.", href: "/product/experiences" }, { label: "Onboarding templates", description: "Start with a welcome flow or setup checklist.", href: "/resources/templates#onboarding" }],
  },
  adoption: {
    metaTitle: "Feature adoption and discovery | Movcues",
    path: "/solutions/feature-adoption",
    eyebrow: "Feature adoption",
    title: "Turn feature discovery into feature adoption.",
    description: "Find the users who would benefit, see who has not adopted the capability, guide them in context, and measure use after exposure.",
    visual: "adoption",
    secondaryLabel: "See the adoption flow",
    workflow: { title: "Discovery is only the beginning.", description: "Carry the workflow through first use and measurable adoption.", steps: ["Eligible users", "Not yet adopted", "Targeted guidance", "Feature used", "Measure"] },
    sections: [
      { eyebrow: "Find the audience", title: "Start with relevance, not reach.", description: "Use properties and behavior to identify users with a real reason to use the feature, then exclude those who already have.", points: ["Combine eligibility and usage signals", "Keep the segment current as behavior changes", "Avoid showing guidance to users who do not need it"], visual: "targeting", tone: "soft" },
      { eyebrow: "Guide and measure", title: "Place discovery beside the feature.", description: "Use an anchored guide, modal, or banner on the relevant page, then compare exposure, completion, and product usage.", points: ["Explain the capability in context", "Advance through a focused multi-step guide", "Track engagement and later feature use"], visual: "experiences", tone: "dark" },
    ],
    related: [{ label: "Analytics", description: "Understand feature usage and product journeys.", href: "/product/analytics" }, { label: "Targeting & segments", description: "Create an audience from eligibility and behavior.", href: "/product/targeting" }, { label: "Adoption templates", description: "Start with an announcement or discovery tooltip.", href: "/resources/templates#adoption" }],
  },
  funnel: {
    metaTitle: "Reduce product funnel drop-off | Movcues",
    path: "/solutions/funnel-dropoff",
    eyebrow: "Reduce funnel drop-off",
    title: "Don't just find drop-off. Act on it.",
    description: "See where the journey breaks, identify the users affected, turn them into a live segment, and guide them back toward success.",
    visual: "funnel",
    secondaryLabel: "Follow the recovery flow",
    workflow: { title: "Continue past “37% dropped here.”", description: "The chart is the start of the workflow, not its conclusion.", steps: ["Funnel", "Drop-off", "Affected users", "Segment", "Experience", "Outcome"], dark: true },
    sections: [
      { eyebrow: "Find the break", title: "Make each important step visible.", description: "Model sign-up, workspace creation, teammate invitation, and first publish as a saved funnel. Compare conversion and inspect where momentum falls away.", points: ["Flexible event-based steps", "Conversion and drop-off by step", "User and session context behind the aggregate"], visual: "analytics", tone: "soft" },
      { eyebrow: "Recover the journey", title: "Reach the people who stopped — not everyone.", description: "Create a funnel cohort from the affected step, refine it with current behavior, and deliver focused guidance on the page where users can continue.", points: ["Dynamic cohort from funnel progress", "Relevant guide, checklist, or banner", "Measure whether users recover and complete"], visual: "targeting", tone: "light" },
    ],
    related: [{ label: "Analytics", description: "Build and inspect the funnel behind the workflow.", href: "/product/analytics" }, { label: "Targeting & segments", description: "Turn drop-off into an addressable audience.", href: "/product/targeting" }, { label: "User onboarding", description: "Apply the workflow to activation.", href: "/solutions/user-onboarding" }],
    cta: { title: "The users behind drop-off are still in the journey.", description: "Find them, guide the next step, and measure whether momentum returns." },
  },
  feedback: {
    metaTitle: "Contextual product feedback | Movcues",
    path: "/solutions/product-feedback",
    eyebrow: "Product feedback",
    title: "Ask the right users, at the right moment.",
    description: "Connect short in-product surveys to the behavior, audience, and product moment that make each response meaningful.",
    visual: "survey",
    secondaryLabel: "See the feedback loop",
    workflow: { title: "Feedback needs behavioral context.", description: "Choose a meaningful moment and a relevant audience before you ask the question.", steps: ["Product moment", "Relevant audience", "Contextual survey", "Response and behavior"] },
    sections: [
      { eyebrow: "Choose the moment", title: "Ask after experience, not at random.", description: "Target users who used a newly launched feature three or more times, match the relevant page, and trigger a short survey in context.", points: ["Segments built from real use", "Page and event-based delivery", "Scheduling and frequency controls"], visual: "targeting", tone: "soft" },
      { eyebrow: "Understand the response", title: "Read metrics and comments together.", description: "See response rate, completion, answer distribution, recent comments, and respondent context in the same results view.", points: ["Quantitative distributions and NPS", "Latest qualitative feedback", "Respondent identity and user context"], visual: "survey", tone: "dark" },
    ],
    related: [{ label: "In-app experiences", description: "Build and target multi-step surveys.", href: "/product/experiences" }, { label: "Targeting & segments", description: "Choose respondents from product behavior.", href: "/product/targeting" }, { label: "Feedback templates", description: "Start from a focused survey pattern.", href: "/resources/templates#feedback" }],
  },
} satisfies Record<string, MarketingPage>;

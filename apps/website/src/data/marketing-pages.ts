export type MarketingPage = {
  title: string;
  metaTitle: string;
  description: string;
  path: string;
  eyebrow: string;
  visual: string;
  secondaryLabel: string;
  bridgeText?: string;
  workflow: { eyebrow?: string; title: string; description: string; steps: string[]; dark?: boolean };
  sections: Array<{ eyebrow: string; title: string; description: string; points: string[]; visual: string; video?: string; tone?: "light" | "soft" | "dark" }>;
  comments?: Array<{ quote: string; role: string }>;
  commentsTitle?: string;
  related: Array<{ label: string; description: string; href: string }>;
  cta?: { title: string; description: string };
};

export const marketingPages = {
  product: {
    metaTitle: "Movcues product platform | Understand and act on user behavior",
    path: "/product",
    eyebrow: "The Movcues platform",
    title: "Turn product evidence into a useful next step.",
    description: "Follow behavior through funnels, sessions, pages, and events; define the affected audience; then publish guidance where it can help.",
    visual: "platform",
    secondaryLabel: "Explore the platform",
    bridgeText: "Movcues keeps observation, audience definition, delivery, and reporting in one workspace—so a finding does not disappear into a handoff.",
    commentsTitle: "One workspace, four connected jobs.",
    comments: [
      { quote: "Inspect an event, page, session, or funnel before deciding where attention is needed.", role: "Observe" },
      { quote: "Save the affected cohort as a reusable segment instead of exporting a one-time list.", role: "Define audience" },
      { quote: "Use that segment to configure guidance, then review the engagement it receives.", role: "Deliver and review" },
    ],
    workflow: {
      eyebrow: "The product loop",
      title: "A practical loop from evidence to delivery.",
      description: "Review a journey, save the people behind it as a segment, target an experience, and track its engagement in the same workspace.",
      steps: ["Inspect", "Define audience", "Publish guidance", "Review engagement"],
      dark: true
    },
    sections: [
      {
        eyebrow: "From signal to action",
        title: "Move from a journey to the people in it.",
        description: "Use saved funnels and session evidence to identify a point of friction, then create a reusable audience from the users who reached or dropped after a step.",
        points: ["Inspect events, pages, sessions, funnels, and dashboards", "Create segments from behavior, properties, pages, and funnel cohorts", "Use the same audience when configuring an experience"],
        visual: "analytics",
        video: "/videos/product/product/session_analytics.mp4",
        tone: "soft"
      },
      {
        eyebrow: "A connected workflow",
        title: "Configure guidance against the real page.",
        description: "Open the live editor from an experience draft to select an element, set placement, and review delivery rules before publishing.",
        points: ["Select a reliable live-page target for anchored guidance", "Set the audience, page rules, trigger, schedule, and frequency", "Publish a reviewed draft when its targeting is ready"],
        visual: "targeting",
        tone: "light"
      },
    ],
    related: [
      { label: "Analytics", description: "See where users move forward and where they stop.", href: "/product/analytics" },
      { label: "In-app experiences", description: "Guide users with contextual product experiences.", href: "/product/experiences" },
      { label: "Targeting & segments", description: "Reach the exact users who need attention.", href: "/product/targeting" }
    ],
  },

  analytics: {
    metaTitle: "Product analytics that leads to action | Movcues",
    path: "/product/analytics",
    eyebrow: "Movcues analytics",
    title: "Find the step that needs attention.",
    description: "Build an event- or page-based funnel, inspect conversion and the users behind each step, then save a reached or drop-off cohort as a segment.",
    visual: "analytics",
    secondaryLabel: "See the workflow",
    bridgeText: "A conversion chart is an entry point. The useful follow-up is the cohort, session evidence, or dashboard view that helps a team decide what to change.",

    commentsTitle: "From a funnel result to an audience.",
    comments: [
      { quote: "Define an ordered journey with event and page steps, a date range, and a conversion window.", role: "Model the journey" },
      { quote: "Open a step to inspect its conversion, drop-off, and the users who reached it.", role: "Inspect the cohort" },
      { quote: "Create a reached or drop-off cohort segment, then refine it with additional conditions.", role: "Prepare the next action" },
    ],

    workflow: {
      title: "Use analysis to prepare a next action.",
      description: "Funnels, users, sessions, and segments are connected so an observed drop-off can become a targeted follow-up—not just a report.",
      steps: ["Model a journey", "Inspect the cohort", "Save a segment", "Track experience engagement"]
    },

    sections: [
      {
        eyebrow: "Understand the journey",
        title: "Inspect the journey before you intervene.",
        description: "Define meaningful funnel steps, compare conversion, and open the related users or recorded session activity to understand the context around a drop.",
        points: ["Build event- and page-based funnel steps", "Use date ranges, conversion windows, and saved segment filters", "Open users and session activity from the funnel breakdown"],
        visual: "platform",
        tone: "soft"
      },
      {
        eyebrow: "Friction to audience",
        title: "Save the cohort, then refine it.",
        description: "Create a segment from a funnel step, then combine it with event, page, and user-property conditions before using it in an experience audience.",
        points: ["Create reached and drop-off cohorts from a funnel", "Nest audience conditions with all/any matching", "Review experience reach, engagement, completion, and responses"],
        visual: "targeting",
        tone: "dark"
      },
    ],

    related: [
      { label: "Reduce funnel drop-off", description: "A complete workflow for finding and recovering friction.", href: "/solutions/funnel-dropoff" },
      { label: "Targeting & segments", description: "Build an audience from what users did or missed.", href: "/product/targeting" },
      { label: "Feature adoption", description: "Measure use before and after contextual guidance.", href: "/solutions/feature-adoption" }
    ],
  },

  experiences: {
    metaTitle: "Contextual in-app experiences | Movcues",
    path: "/product/experiences",
    eyebrow: "In-app experiences",
    title: "Build in-product guidance around a real moment.",
    description: "Create guides, surveys, banners, and checklists in the dashboard, then configure where, when, and for whom each experience should appear.",
    visual: "experiences",
    secondaryLabel: "Explore experience types",
    bridgeText: "Effective guidance is deliberate: it has a clear job, a bounded audience, and a page or event that makes its timing understandable.",

    commentsTitle: "What every experience draft makes explicit.",
    comments: [
      { quote: "The content and format: guide, survey, banner, or checklist.", role: "What users see" },
      { quote: "The audience, page rules, trigger, frequency, schedule, and priority.", role: "Who sees it and when" },
      { quote: "The engagement signals available after the experience is live.", role: "What to review next" },
    ],

    workflow: {
      title: "Prepare the experience before you publish it.",
      description: "A draft moves from content and target selection to audience, page rules, trigger, frequency, schedule, and review.",
      steps: ["Build the content", "Choose an audience", "Set delivery rules", "Review engagement"],
      dark: true
    },

    sections: [
      {
        eyebrow: "Build visually",
        title: "Choose a format that fits the task.",
        description: "Use multi-step guides, contextual surveys, full-width banners, or persistent checklists to help users complete a focused piece of work.",
        points: ["Guide steps can advance by button, element, event, or route", "Surveys support structured questions and multi-step responses", "Checklist tasks can open a page or launch a guide"],
        visual: "experiences",
        tone: "light"
      },
      {
        eyebrow: "Deliver contextually",
        title: "Make delivery rules explicit.",
        description: "Choose a saved segment or combined segment rules, match a page, select a page-load, custom-event, or manual trigger, and set a delivery window.",
        points: ["Page and audience targeting", "Behavioral and manual triggers", "Frequency, priority, and scheduling controls"],
        visual: "targeting",
        tone: "soft"
      },
      {
        eyebrow: "Measure the result",
        title: "Review engagement before the next iteration.",
        description: "Use the overview and experience lists to review reach, starts, completions, dismissals, survey submissions, and response detail.",
        points: ["Experience-level reach, engagement, and completion metrics", "Survey distributions, written feedback, and respondent context", "Dashboard cards for funnel, retention, and experience metrics"],
        visual: "survey",
        tone: "dark"
      },
    ],

    related: [
      { label: "User onboarding", description: "Guide new users toward their first success.", href: "/solutions/user-onboarding" },
      { label: "Product feedback", description: "Ask relevant users at a meaningful moment.", href: "/solutions/product-feedback" },
      { label: "Templates", description: "Start from a focused experience pattern.", href: "/resources/templates" }
    ],
  },

  targeting: {
    metaTitle: "Behavioral targeting and dynamic segments | Movcues",
    path: "/product/targeting",
    eyebrow: "Targeting & segments",
    title: "Build an audience from product behavior.",
    description: "Create dynamic segments from events, user properties, page visits, funnel cohorts, and survey responses—then use them as experience audiences.",
    visual: "targeting",
    secondaryLabel: "See an audience example",
    bridgeText: "A saved segment makes the rationale for an experience visible: what users did, what they have not done, and the conditions that qualify them.",

    commentsTitle: "A segment is a reusable definition.",
    comments: [
      { quote: "Combine event, page, property, funnel-cohort, and survey-response conditions.", role: "Describe behavior" },
      { quote: "Use all/any groups to express the audience logic without exporting a static list.", role: "Refine the audience" },
      { quote: "Select the saved segment when configuring an experience for eligible users.", role: "Use it in delivery" },
    ],

    workflow: {
      title: "From observed behavior to a defined audience.",
      description: "Segments are reusable definitions. They stay tied to the events, page visits, properties, cohorts, or responses that describe the intended audience.",
      steps: ["Define conditions", "Preview the audience", "Use it in delivery"],
      dark: true
    },

    sections: [
      {
        eyebrow: "Audience logic",
        title: "Use conditions instead of a static export.",
        description: "Combine event, property, page, funnel-cohort, and survey-response conditions with nested all/any logic to describe the users you want to reach.",
        points: ["Users who reached a funnel step but did not continue", "Users with a product property or a relevant page visit", "Survey respondents grouped by a structured answer"],
        visual: "targeting",
        tone: "soft"
      },
      {
        eyebrow: "Delivery context",
        title: "Pair eligibility with delivery context.",
        description: "A segment decides who can qualify. Page rules, triggers, frequency, scheduling, and priority decide whether an experience is appropriate at that moment.",
        points: ["Target matching product pages", "Trigger on page load or a custom event", "Set active windows and repeat behavior"],
        visual: "experiences",
        tone: "light"
      },
    ],

    related: [
      { label: "User onboarding", description: "Segment new users by activation progress.", href: "/solutions/user-onboarding" },
      { label: "Feature adoption", description: "Find eligible users who have not adopted a feature.", href: "/solutions/feature-adoption" },
      { label: "Analytics", description: "Start an audience from behavioral evidence.", href: "/product/analytics" }
    ],
  },

  onboarding: {
    metaTitle: "User onboarding and activation | Movcues",
    path: "/solutions/user-onboarding",
    eyebrow: "User onboarding & activation",
    title: "Help new users reach value faster.",
    description: "Understand where new users stop, define the behavior that signals value, and guide each person from sign-up to first success.",
    visual: "onboarding",
    secondaryLabel: "See the activation journey",
    workflow: {
      title: "Make activation a visible journey.",
      description: "Define the progress that matters, segment users by where they are, and guide the next useful action.",
      steps: ["Sign up", "Create project", "Configure setup", "First success"]
    },
    sections: [
      {
        eyebrow: "Understand progress",
        title: "Define activation in product behavior.",
        description: "Build the journey around meaningful events and funnel steps. See which step loses new users, then inspect the group affected.",
        points: ["Measure the path to first value", "Create cohorts from funnel progress", "Separate stalled users from active users"],
        visual: "analytics",
        tone: "soft"
      },
      {
        eyebrow: "Guide the next step",
        title: "Onboarding changes as progress changes.",
        description: "Use a welcome guide, anchored tip, setup checklist, or reminder banner according to where each user is in the journey.",
        points: ["Contextual guidance instead of one generic tour", "Persistent checklists for multi-step setup", "Measure activation after exposure"],
        visual: "experiences",
        tone: "dark"
      },
    ],
    related: [
      { label: "Targeting & segments", description: "Build audiences from activation progress.", href: "/product/targeting" },
      { label: "In-app experiences", description: "Choose the right format for each onboarding moment.", href: "/product/experiences" },
      { label: "Onboarding templates", description: "Start with a welcome flow or setup checklist.", href: "/resources/templates#onboarding" }
    ],
  },

  adoption: {
    metaTitle: "Feature adoption and discovery | Movcues",
    path: "/solutions/feature-adoption",
    eyebrow: "Feature adoption",
    title: "Turn feature discovery into feature adoption.",
    description: "Find the users who would benefit, see who has not adopted the capability, guide them in context, and measure use after exposure.",
    visual: "adoption",
    secondaryLabel: "See the adoption flow",
    workflow: {
      title: "Discovery is only the beginning.",
      description: "Carry the workflow through first use and measurable adoption.",
      steps: ["Eligible users", "Not yet adopted", "Targeted guidance", "Feature used", "Measure"]
    },
    sections: [
      {
        eyebrow: "Find the audience",
        title: "Start with relevance, not reach.",
        description: "Use properties and behavior to identify users with a real reason to use the feature, then exclude those who already have.",
        points: ["Combine eligibility and usage signals", "Keep the segment current as behavior changes", "Avoid showing guidance to users who do not need it"],
        visual: "targeting",
        tone: "soft"
      },
      {
        eyebrow: "Guide and measure",
        title: "Place discovery beside the feature.",
        description: "Use an anchored guide, modal, or banner on the relevant page, then compare exposure, completion, and product usage.",
        points: ["Explain the capability in context", "Advance through a focused multi-step guide", "Track engagement and later feature use"],
        visual: "experiences",
        tone: "dark"
      },
    ],
    related: [
      { label: "Analytics", description: "Understand feature usage and product journeys.", href: "/product/analytics" },
      { label: "Targeting & segments", description: "Create an audience from eligibility and behavior.", href: "/product/targeting" },
      { label: "Adoption templates", description: "Start with an announcement or discovery tooltip.", href: "/resources/templates#adoption" }
    ],
  },

  funnel: {
    metaTitle: "Reduce product funnel drop-off | Movcues",
    path: "/solutions/funnel-dropoff",
    eyebrow: "Reduce funnel drop-off",
    title: "Don't just find drop-off. Act on it.",
    description: "See where the journey breaks, identify the users affected, turn them into a live segment, and guide them back toward success.",
    visual: "funnel",
    secondaryLabel: "Follow the recovery flow",
    workflow: {
      title: "Continue past “37% dropped here.”",
      description: "The chart is the start of the workflow, not its conclusion.",
      steps: ["Funnel", "Drop-off", "Affected users", "Segment", "Experience", "Outcome"],
      dark: true
    },
    sections: [
      {
        eyebrow: "Find the break",
        title: "Make each important step visible.",
        description: "Model sign-up, workspace creation, teammate invitation, and first publish as a saved funnel. Compare conversion and inspect where momentum falls away.",
        points: ["Flexible event-based steps", "Conversion and drop-off by step", "User and session context behind the aggregate"],
        visual: "analytics",
        tone: "soft"
      },
      {
        eyebrow: "Recover the journey",
        title: "Reach the people who stopped — not everyone.",
        description: "Create a funnel cohort from the affected step, refine it with current behavior, and deliver focused guidance on the page where users can continue.",
        points: ["Dynamic cohort from funnel progress", "Relevant guide, checklist, or banner", "Measure whether users recover and complete"],
        visual: "targeting",
        tone: "light"
      },
    ],
    related: [
      { label: "Analytics", description: "Build and inspect the funnel behind the workflow.", href: "/product/analytics" },
      { label: "Targeting & segments", description: "Turn drop-off into an addressable audience.", href: "/product/targeting" },
      { label: "User onboarding", description: "Apply the workflow to activation.", href: "/solutions/user-onboarding" }
    ],
    cta: {
      title: "The users behind drop-off are still in the journey.",
      description: "Find them, guide the next step, and measure whether momentum returns."
    },
  },

  feedback: {
    metaTitle: "Contextual product feedback | Movcues",
    path: "/solutions/product-feedback",
    eyebrow: "Product feedback",
    title: "Ask the right users, at the right moment.",
    description: "Connect short in-product surveys to the behavior, audience, and product moment that make each response meaningful.",
    visual: "survey",
    secondaryLabel: "See the feedback loop",
    workflow: {
      title: "Feedback needs behavioral context.",
      description: "Choose a meaningful moment and a relevant audience before you ask the question.",
      steps: ["Product moment", "Relevant audience", "Contextual survey", "Response and behavior"]
    },
    sections: [
      {
        eyebrow: "Choose the moment",
        title: "Ask after experience, not at random.",
        description: "Target users who used a newly launched feature three or more times, match the relevant page, and trigger a short survey in context.",
        points: ["Segments built from real use", "Page and event-based delivery", "Scheduling and frequency controls"],
        visual: "targeting",
        tone: "soft"
      },
      {
        eyebrow: "Understand the response",
        title: "Read metrics and comments together.",
        description: "See response rate, completion, answer distribution, recent comments, and respondent context in the same results view.",
        points: ["Quantitative distributions and NPS", "Latest qualitative feedback", "Respondent identity and user context"],
        visual: "survey",
        tone: "dark"
      },
    ],
    related: [
      { label: "In-app experiences", description: "Build and target multi-step surveys.", href: "/product/experiences" },
      { label: "Targeting & segments", description: "Choose respondents from product behavior.", href: "/product/targeting" },
      { label: "Feedback templates", description: "Start from a focused survey pattern.", href: "/resources/templates#feedback" }
    ],
  },
} satisfies Record<string, MarketingPage>;

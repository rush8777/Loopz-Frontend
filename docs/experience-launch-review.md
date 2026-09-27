# Experience launch review

The first-time launch workflow is tracked by the nullable `experiences.launch_setup_completed_at` column in Loopz Backend. The dashboard marks it through the idempotent `POST /orgs/:orgId/sites/:siteId/experiences/:experienceId/launch-setup/complete` endpoint when a user finishes the guided setup and reaches Review.

This metadata is Experience-level collaboration state: it is shared across browsers and organization members, and it is intentionally independent of publication status. It is not stored in a version definition, GrapesJS HTML/CSS, `projectData`, or browser storage.

Launch readiness is derived on demand from the current draft plus Pages, Segments, Events, and referenced Guides. Summaries are also derived and are never persisted. Client checks provide guidance, while the existing publish endpoint and backend validation remain authoritative.

Both opening Review & publish and selecting Publish now use the established editor lifecycle: synchronously flush the active GrapesJS builder, wait for the queued draft save, then continue. GrapesJS hydration, canonical HTML/CSS persistence, and SDK rendering are unchanged.

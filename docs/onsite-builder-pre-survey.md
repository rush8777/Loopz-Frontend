# Phase 8.5 dashboard stabilization

Baseline `codex/onsite-builder-guide-logic` at `835957f`; feature branch `codex/onsite-builder-pre-survey`. No merge or deployment.

- Restored Survey Results with the existing flush/save-before-navigation and failed-save handling.
- Made Other experience navigation open on click, touch or keyboard and close with Escape.
- Kept the creation dialog's actions within the viewport using a scrolling content region and fixed header/footer.
- Repaired the GrapesJS test mock to render the real canvas overlay. Updated signup/onboarding, navigation and funnel expectations against verified current behavior without removing assertions or tests.
- Added an optional route prefix to the existing React Guide fixture for actual-service integration; production routes are unchanged.

Verification: all 295 dashboard tests pass (44 files); production build passes. The initial 14 failures are resolved. Existing large-chunk build warnings remain.

The SDK repository's `docs/onsite-builder-pre-survey.md` contains the shared failure classification, 153-test cross-browser matrix, six passing actual dashboard/API/database/published-SDK integration runs (two per browser), bundle comparison and environment limitations. Its `docs/phase-9-survey-handoff.md` describes reuse of the existing Survey model, persistence, analytics and renderer. No Survey authoring functionality is added.

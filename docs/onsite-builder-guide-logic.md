# Phase 8 Guide integration

Branch: `codex/onsite-builder-guide-logic`, based on verified `a5c4aae27f417c3716327d6d7b7ec5d615c691b9`.

Experience types now preserve optional independent `advance.target` and `presentation` settings. Publish review shows actual event names, routes, selectors, hover durations, delays and fallback choices. Launch checks reject invalid timing, trigger combinations, route/event settings, duplicate IDs, missing targets and final-step skips. The backend remains authoritative and revision-checked publishing is unchanged.

Eight added readiness tests pass. Full dashboard suite: 281 passed, the same 14 baseline failure names remain. Production dashboard build passes. No production React dependency or major dashboard redesign was added.

`apps/dashboard/tests/guide-fixture/App.tsx` is a test-only React host used by the sibling SDK Playwright suite: real routes, History API, back/forward and async DOM. Install both repositories' dependencies before running SDK browser tests. Chromium: 50/50 cases pass; Firefox/WebKit unavailable.

Full model/defaults, file inventory, test coverage, SDK gzip comparison and limits: [SDK report](https://github.com/rush8777/Loopz/blob/codex/onsite-builder-guide-logic/docs/onsite-builder-guide-logic.md).

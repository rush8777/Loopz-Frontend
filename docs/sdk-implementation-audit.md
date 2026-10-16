# Movcues SDK documentation audit

## Scope

Reviewed the local SDK source at `movcues-sdk` main revision `662e386`, specifically the browser IIFE and ESM entry points, `PublicAPI`, `Analytics`, configuration defaults, MVP policy, route observer, privacy detector, storage wrapper, funnel tracker, package manifest, README, and React/Next examples.

## Verified inventory

| Area | Verified behavior |
| --- | --- |
| IIFE loader | `dist/v1.js` exposes `window.analytics` and `window.__myAnalytics__`; `data-site-id` auto-initializes. |
| ES module | Package manifest names `@movcues/sdk`; source exports `createAnalytics` and `Analytics`. |
| Public API | `init`, `start`, `stop`, `destroy`, `event`, `identify`, `reset`, `page`, `defineFunnel`, `launchExperience`, `enableDebug`, `disableDebug`. |
| Current automatic capture | page views, interactive clicks, scroll milestones, rage clicks. |
| Current policy boundary | cursor, hover, move, element crawler, heatmaps, session replay are hard-disabled by `MVP1_POLICY`. |
| SPA behavior | Observes history push/replace, popstate, and hashchange; restores patched history on stop/destroy. |
| Privacy | `data-private`, `data-ignore`, and `data-analytics-ignore` suppress automatic capture for a subtree. |
| Identity/session | Stable identity is session-scoped; `reset()` clears it and starts a new anonymous/session context. |
| Delivery | In-memory batching defaults to 50 events or 5 seconds, with a maximum queue of 2,000 and three retries. |

## Gaps and stale material

- The historical React and Next examples import `movcues/sdk`, while the package manifest declares `@movcues/sdk`.
- The public registry release of `@movcues/sdk` was not independently verified during this audit; docs therefore do not promise a public `npm install` workflow.
- Existing README copy discusses collectors that the current MVP1 policy disables. The docs describe them as unavailable.
- The SDK source confirms a Site ID is required but does not confirm the exact dashboard screen where customers retrieve it.
- Endpoint/bundle URL overrides exist in source but their customer-support status needs product confirmation.
- Feedback config carries a placeholder base URL; it is not documented as an active customer capability.

## Documentation decisions

- API examples use only the verified surface.
- The quickstart uses the verified CDN loader.
- ESM usage is documented as source/package usage with registry-publication caveat.
- No private backend routes, secrets, or unverified experience-management workflows are described.

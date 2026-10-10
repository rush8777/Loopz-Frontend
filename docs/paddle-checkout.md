# Paddle checkout configuration

After deploying the dashboard, set **Checkout → Checkout configuration → Default payment link** to `https://dash.movcues.com/checkout` in the Paddle account used by the backend. This public route loads and initializes Paddle.js; Paddle automatically opens transactions supplied in `_ptxn`, including payment-method update links. It does not create a transaction on a page visit.

For live accounts, approve `dash.movcues.com` in Paddle before using the URL. Configure sandbox separately when testing.

- Frontend: `VITE_PADDLE_CLIENT_TOKEN` must be a Paddle **client-side token**, starting with `test_` (sandbox) or `live_` (production). The frontend selects the matching environment from this prefix. Never put the backend API key here.
- Backend: `PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, and all plan price IDs must belong to the same Paddle account/environment. Keep the webhook secret configured so confirmed subscriptions update organization entitlements.
- Rebuild the frontend after changing its token; Vite variables are included at build time.

The default payment link is an account setting, required even for dashboard overlay checkout. Repository changes cannot set it in Paddle. A missing link or unapproved domain now returns `503 billing_checkout_not_configured` with an actionable message rather than a generic internal error.

To verify: open `/checkout` directly (no login required), then choose a plan from Billing. Verify payment and the subscription webhook in sandbox using Paddle's documented test payment details before processing real payments.

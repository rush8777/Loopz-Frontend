import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { initializePaddleCheckout } from "../../lib/paddleCheckout";

/** Public Paddle payment-link destination, including payment-method recovery links. */
export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("_ptxn");
  const invalidLink = transactionId !== null && !/^txn_[a-z0-9]{26}$/.test(transactionId);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (invalidLink) return;
    let active = true;
    setReady(false);
    setError(null);
    // Paddle.js handles _ptxn automatically on initialization. Calling open()
    // here would duplicate that checkout and break payment-method update links.
    void initializePaddleCheckout().then(() => {
      if (active) setReady(true);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Checkout could not be loaded.");
    });
    return () => { active = false; };
  }, [invalidLink, attempt]);

  const message = invalidLink ? "This payment link is invalid. Open a new link from Billing or your Paddle email."
    : error ?? (!ready ? "Loading secure checkout…"
      : transactionId ? "Use the secure Paddle checkout window to continue. If you closed it, reload this page to reopen your payment link."
        : "Choose a plan from Billing or open the payment link from your Paddle email to continue.");

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
    <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm" aria-labelledby="checkout-title">
      <p className="text-sm font-medium text-primary">Movcues · Secure checkout</p>
      <h1 id="checkout-title" className="mt-2 text-2xl font-semibold tracking-tight">Complete your checkout</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground" role={error || invalidLink ? "alert" : "status"}>{message}</p>
      {error && <button type="button" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
      <Link className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4" to="/billing">Return to billing</Link>
      <p className="mt-6 text-xs text-muted-foreground">Payments are processed securely by Paddle. Your plan updates after payment is confirmed.</p>
    </section>
  </main>;
}

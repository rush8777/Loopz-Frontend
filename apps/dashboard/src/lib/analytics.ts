type Gtag = (...args: [string, ...unknown[]]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function trackEvent(name: string, parameters?: Record<string, unknown>) {
  if (typeof window !== "undefined") window.gtag?.("event", name, parameters ?? {});
}

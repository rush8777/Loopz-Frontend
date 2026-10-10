type PaddleCheckout = {
  Environment: { set: (environment: "sandbox" | "production") => void };
  Checkout: { open: (input: { transactionId: string; settings?: { displayMode?: "overlay"; theme?: "light" | "dark" } }) => void };
  Initialize: (input: { token: string }) => void;
};

declare global {
  interface Window { Paddle?: PaddleCheckout }
}

let loading: Promise<PaddleCheckout> | null = null;
let initializedToken: string | null = null;

function loadPaddle(): Promise<PaddleCheckout> {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    const failed = (message: string) => { script.remove(); loading = null; reject(new Error(message)); };
    script.onload = () => window.Paddle ? resolve(window.Paddle) : failed("Paddle failed to initialize.");
    script.onerror = () => failed("Paddle Checkout could not be loaded. Please try again.");
    document.head.appendChild(script);
  });
  return loading;
}

export async function initializePaddleCheckout(): Promise<PaddleCheckout> {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) throw new Error("Paddle Checkout is not configured.");
  if (!token.startsWith("test_") && !token.startsWith("live_")) throw new Error("Paddle Checkout requires a client-side token.");
  const paddle = await loadPaddle();
  if (initializedToken !== token) {
    paddle.Environment.set(token.startsWith("test_") ? "sandbox" : "production");
    paddle.Initialize({ token });
    initializedToken = token;
  }
  return paddle;
}

export async function openPaddleCheckout(transactionId: string) {
  const paddle = await initializePaddleCheckout();
  paddle.Checkout.open({ transactionId, settings: { displayMode: "overlay", theme: "light" } });
}

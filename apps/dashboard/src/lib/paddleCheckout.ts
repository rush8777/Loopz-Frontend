type PaddleCheckout = {
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
    script.onload = () => window.Paddle ? resolve(window.Paddle) : reject(new Error("Paddle failed to initialize."));
    script.onerror = () => reject(new Error("Paddle Checkout could not be loaded."));
    document.head.appendChild(script);
  });
  return loading;
}

export async function openPaddleCheckout(transactionId: string) {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) throw new Error("Paddle Checkout is not configured.");
  const paddle = await loadPaddle();
  if (initializedToken !== token) {
    paddle.Initialize({ token });
    initializedToken = token;
  }
  paddle.Checkout.open({ transactionId, settings: { displayMode: "overlay", theme: "light" } });
}

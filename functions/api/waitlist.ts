interface D1Statement {
  bind(...values: (string | null)[]): D1Statement;
  run(): Promise<unknown>;
}

interface Env {
  WAITLIST_DB: { prepare(query: string): D1Statement };
}

interface WaitlistContext {
  request: Request;
  env: Env;
}

type WaitlistRequest = {
  name?: unknown;
  email?: unknown;
  website?: unknown;
  elapsedMs?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const json = (body: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const onRequestPost = async ({ request, env }: WaitlistContext): Promise<Response> => {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) return json({ message: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ message: "Invalid request." }, 415);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000) return json({ message: "Invalid request." }, 413);

  let payload: WaitlistRequest;
  try {
    payload = await request.json() as WaitlistRequest;
  } catch {
    return json({ message: "Invalid request." }, 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const honeypot = typeof payload.website === "string" ? payload.website.trim() : "";
  const elapsedMs = typeof payload.elapsedMs === "number" ? payload.elapsedMs : 0;

  if (honeypot || elapsedMs < 900) return json({ message: "Thanks — we’ll be in touch." });
  if (name.length > 100 || email.length > 254 || !emailPattern.test(email)) return json({ message: "Enter a valid email address." }, 400);

  try {
    await env.WAITLIST_DB
      .prepare("INSERT INTO waitlist (name, email) VALUES (?, ?)")
      .bind(name || null, email)
      .run();
    return json({ message: "You’re on the list — thank you!" }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique") || message.includes("constraint")) {
      return json({ message: "This email is already on the waitlist." }, 409);
    }
    console.error("Waitlist submission failed", error);
    return json({ message: "We couldn’t join you right now. Please try again." }, 500);
  }
};

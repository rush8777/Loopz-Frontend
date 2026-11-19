import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { BLOG_PATH, isArticleSlug } from "./config.mjs";
import { blogClient } from "./content.mjs";

const COOKIE = "movcues_blog_preview";
const MAX_AGE = 3600;
const encoder = new TextEncoder();

function signingKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(`movcues-blog:${secret}`),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function cookie(value, age) {
  return `${COOKIE}=${value}; Path=${BLOG_PATH}; Max-Age=${age}; HttpOnly; Secure; SameSite=None`;
}

function previewResponse(status, headers = {}, body = null) {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer", ...headers },
  });
}

export async function inPreview(request, env) {
  if (!env.SANITY_PREVIEW_TOKEN) return false;
  const session = request.headers.get("Cookie")?.split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const match = /^(\d{10})\.([0-9a-f]{64})$/.exec(session ?? "");
  if (!match) return false;
  const [, expires, signature] = match;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const bytes = Uint8Array.from(signature.match(/.{2}/g), (pair) => parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", await signingKey(env.SANITY_PREVIEW_TOKEN), bytes, encoder.encode(expires));
}

export async function startPreview(request, env) {
  if (!env.SANITY_PREVIEW_TOKEN) return previewResponse(404, {}, "Preview is unavailable.");
  const current = new URL(request.url);
  const { isValid, redirectTo } = await validatePreviewUrl(blogClient(env, true), current.href);
  if (!isValid) return previewResponse(401, {}, "Open a new preview from Sanity Studio.");
  const target = URL.parse(redirectTo || BLOG_PATH, current.origin);
  const slug = target?.pathname.slice(BLOG_PATH.length + 1).replace(/\/$/, "");
  if (target?.origin !== current.origin || (!["/blog", "/blog/"].includes(target.pathname)
    && (!target.pathname.startsWith("/blog/") || !isArticleSlug(slug)))) {
    return previewResponse(400, {}, "Invalid blog preview path.");
  }

  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(env.SANITY_PREVIEW_TOKEN),
    encoder.encode(expires)));
  const hex = Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return previewResponse(303, {
    Location: slug ? `${BLOG_PATH}/${slug}` : BLOG_PATH,
    "Set-Cookie": cookie(`${expires}.${hex}`, MAX_AGE),
  });
}

export function stopPreview() {
  return previewResponse(303, { Location: BLOG_PATH, "Set-Cookie": cookie("", 0) });
}

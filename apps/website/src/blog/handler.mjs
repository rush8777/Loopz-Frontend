/// <reference types="@cloudflare/workers-types" />

import { BLOG_PAGE_SIZE, BLOG_PATH, BLOG_SITEMAP_PATH, BLOG_TOPICS, blogListUrl, isArticleSlug } from "./config.mjs";
import { blogClient, feedArticles, getArticle, listArticles, relatedArticles, sitemapArticles } from "./content.mjs";
import { inPreview, startPreview, stopPreview } from "./preview.mjs";
import { additionalHead, articleSeo, blogFeed, blogSitemap, listingSeo, renderArticle, renderListing, renderMessage } from "./render.mjs";

const PUBLIC_CACHE = "public, max-age=0, s-maxage=120";
const PRIVATE_CACHE = "private, no-store";

function blogHtml(shell, content, seo, { status = 200, draft = false, cacheable = false } = {}) {
  const set = (selector, attribute, value) => rewriter.on(selector, {
    element: (element) => { element.setAttribute(attribute, value); },
  });
  const robots = draft || status !== 200 ? "noindex, nofollow" : seo.robots;
  const rewriter = new HTMLRewriter()
    .on("title", { element: (element) => { element.setInnerContent(seo.title); } })
    .on("head", { element: (element) => { element.append(additionalHead(seo, draft || status !== 200), { html: true }); } })
    .on("#blog-content", { element: (element) => { element.setInnerContent(content, { html: true }); } });

  set('link[rel="canonical"]', "href", seo.canonical);
  set('meta[name="robots"]', "content", robots);
  set('meta[name="description"]', "content", seo.description);
  set('meta[property="og:type"]', "content", seo.publishedAt ? "article" : "website");
  set('meta[property="og:url"]', "content", seo.canonical);
  set('meta[property="og:title"]', "content", seo.title);
  set('meta[property="og:description"]', "content", seo.description);
  set('meta[name="twitter:card"]', "content", seo.image ? "summary_large_image" : "summary");
  set('meta[name="twitter:title"]', "content", seo.title);
  set('meta[name="twitter:description"]', "content", seo.description);
  if (draft) rewriter.on("[data-site-analytics]", { element: (element) => { element.remove(); } });

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": cacheable ? PUBLIC_CACHE : PRIVATE_CACHE,
  });
  if (robots.includes("noindex")) headers.set("X-Robots-Tag", robots);
  if (draft) headers.set("Referrer-Policy", "no-referrer");
  if (status === 503) headers.set("Retry-After", "120");
  return rewriter.transform(new Response(shell.body, { status, headers }));
}

function xml(content, type, configured) {
  return new Response(content, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Cache-Control": configured ? PUBLIC_CACHE : PRIVATE_CACHE,
    },
  });
}

function readRoute(url) {
  if (url.pathname === BLOG_SITEMAP_PATH) return { kind: "sitemap", key: url.pathname };
  if (url.pathname === BLOG_PATH) {
    const topic = url.searchParams.get("topic") || null;
    const requestedPage = url.searchParams.get("page") || "1";
    if ((topic && !BLOG_TOPICS.some((item) => item.slug === topic)) || !/^[1-9]\d{0,3}$/.test(requestedPage)) return null;
    const page = Number(requestedPage);
    return { kind: "list", topic, page, key: blogListUrl(topic, page) };
  }

  const slug = url.pathname.slice(BLOG_PATH.length + 1);
  if (slug === "feed.xml") return { kind: "feed", key: url.pathname };
  if (isArticleSlug(slug)) return { kind: "article", slug, key: url.pathname };
  return null;
}

async function shellFor(env, url) {
  // Pages' ASSETS binding serves the built Astro document directly.
  const shell = await env.ASSETS.fetch(new URL("/blog/", url));
  if (!shell.ok) throw new Error(`Astro blog shell returned HTTP ${shell.status}`);
  return shell;
}

async function routeResponse(env, url, route, draft) {
  const client = blogClient(env);
  if (route?.kind === "sitemap") return xml(blogSitemap(await sitemapArticles(client)), "application/xml", !!client);
  if (route?.kind === "feed") return xml(blogFeed(await feedArticles(client)), "application/rss+xml", !!client);

  if (route?.kind === "list") {
    const { topic, page } = route;
    const { items, total } = await listArticles(client, topic, page);
    const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
    if (page <= pages) {
      return blogHtml(await shellFor(env, url), renderListing({ items, total, topic, page, pages }),
        listingSeo(topic, page), { cacheable: !!client && !draft, draft });
    }
  }

  if (route?.kind === "article") {
    const article = await getArticle(draft ? blogClient(env, true) : client, route.slug, draft);
    if (article) {
      const related = await relatedArticles(client, article).catch(() => []);
      return blogHtml(await shellFor(env, url), renderArticle(article, related, draft), articleSeo(article),
        { draft, cacheable: !draft });
    }
  }

  return blogHtml(await shellFor(env, url), renderMessage("Article not found", "This page may have moved or is still being written."),
    { ...listingSeo(null, 1), title: "Page not found | Movcues Blog" }, { status: 404, draft });
}

async function serveBlog(request, env, context) {
  const url = new URL(request.url);
  const head = request.method === "HEAD";
  if (!head && request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": PRIVATE_CACHE } });
  }

  if (url.pathname.endsWith("/")) {
    return new Response(null, { status: 301, headers: { Location: url.pathname.replace(/\/+$/, "") + url.search } });
  }
  const route = readRoute(url);
  let draft = false;
  try {
    if (url.pathname === "/blog/preview/enable" && !head) return await startPreview(request, env);
    if (url.pathname === "/blog/preview/disable" && !head) return stopPreview();

    if (route?.kind === "article" || route?.kind === "list") draft = await inPreview(request, env);
    const cache = !draft && route && globalThis.caches?.default;
    const key = cache ? new Request(new URL(route.key, url)) : null;
    let response = key ? await cache.match(key).catch(() => undefined) : undefined;
    if (!response) {
      response = await routeResponse(env, url, route, draft);
      if (key && response.headers.get("Cache-Control") === PUBLIC_CACHE) {
        context.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      }
    }

    return head ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch (error) {
    console.error("Movcues blog request failed", error?.name ?? "Error", error?.statusCode ?? "");
    const headers = { "Cache-Control": PRIVATE_CACHE, "X-Robots-Tag": "noindex", "Retry-After": "120" };
    if (head || route?.kind === "feed" || route?.kind === "sitemap" || url.pathname.startsWith("/blog/preview")) {
      return new Response(head ? null : "The blog is temporarily unavailable.", { status: 503, headers });
    }
    try {
      return blogHtml(await shellFor(env, url), renderMessage("The blog is temporarily unavailable", "Please try again in a few minutes."),
        { ...listingSeo(null, 1), title: "Blog temporarily unavailable | Movcues" }, { status: 503, draft });
    } catch {
      return new Response("The blog is temporarily unavailable.", { status: 503, headers });
    }
  }
}

export default {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    if (pathname === BLOG_PATH || pathname.startsWith(BLOG_PATH + "/") || pathname === BLOG_SITEMAP_PATH) {
      return serveBlog(request, env, context);
    }
    return env.ASSETS.fetch(request);
  },
};

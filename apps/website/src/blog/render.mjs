import { escapeHTML, toHTML, uriLooksSafe } from "@portabletext/to-html";
import {
  BLOG_DESCRIPTION, BLOG_ORIGIN, BLOG_PATH, BLOG_TITLE, BLOG_SPOTLIGHT_SIZE, BLOG_TOPICS, blogListUrl, isArticleSlug,
} from "./config.mjs";

const DEFAULT_SOCIAL_IMAGE = "https://movcues.com/movcues-blog-social.png";
const formatDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const escape = (value) => escapeHTML(String(value ?? ""));
const absolute = (path) => new URL(path, BLOG_ORIGIN).href;
const articlePath = (slug) => `${BLOG_PATH}/${slug}`;

function publicationDate(value) {
  const date = new Date(value || NaN);
  if (Number.isNaN(date.getTime())) return "";
  return `<time datetime="${date.toISOString()}">${formatDate.format(date)}</time>`;
}

function minutesToRead(article) {
  if (!(article.bodyLength > 0)) return "";
  return `${Math.max(1, Math.round(article.bodyLength / 1000))} min read`;
}

function imageUrl(image, width) {
  const url = URL.parse(image?.url ?? "", BLOG_ORIGIN);
  if (url?.origin !== "https://cdn.sanity.io" || !url.pathname.startsWith("/images/")) return "";
  url.searchParams.set("w", String(width));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  return url.href;
}

function coverImage(image, { lead = false, inline = false, compact = false } = {}) {
  const width = inline || lead ? 1440 : 640;
  const src = imageUrl(image, width);
  if (!src) return "";
  const displayWidth = Math.min(image.width || width, width);
  const displayHeight = image.width && image.height
    ? Math.max(1, Math.round(displayWidth * image.height / image.width)) : Math.round(displayWidth * 9 / 16);
  const srcset = [480, 800, 1200, 1440]
    .filter((size) => size < displayWidth)
    .concat(displayWidth)
    .map((size) => `${escape(imageUrl(image, size))} ${size}w`)
    .join(", ");
  const sizes = compact ? "(max-width: 620px) 36vw, 240px" : inline ? "(max-width: 720px) 90vw, 720px"
    : lead ? "(max-width: 760px) 90vw, (max-width: 1200px) 55vw, 980px"
      : "(max-width: 580px) 90vw, (max-width: 960px) 45vw, 370px";
  return `<img src="${escape(src)}" srcset="${srcset}" sizes="${sizes}" alt="${escape(image.alt)}"
    width="${displayWidth}" height="${displayHeight}" ${lead ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function topicFor(article) {
  return BLOG_TOPICS.find((topic) => topic.slug === article.topic);
}

function articleMeta(article) {
  return [publicationDate(article.publishedAt), minutesToRead(article)]
    .filter(Boolean).join('<span aria-hidden="true">·</span>');
}

function articleCard(article, variant = "standard") {
  const topic = topicFor(article);
  const image = coverImage(article.cover, { lead: variant === "lead", compact: variant === "brief" });
  const heading = variant === "standard" ? "h3" : "h2";
  const href = articlePath(article.slug);
  return `<article class="blog-card blog-card--${variant}${image ? "" : " blog-card--text"}">
    <a class="blog-card-link" href="${href}">
      ${image ? `<div class="blog-card-image">${image}</div>` : ""}
      <div class="blog-card-copy">
        ${topic ? `<span class="blog-topic">${escape(topic.title)}</span>` : ""}
        <${heading}>${escape(article.title)}</${heading}>
        <p>${escape(article.summary)}</p>
        <div class="blog-card-footer">
          <div class="blog-meta">${[escape(article.author) || publicationDate(article.publishedAt), minutesToRead(article)]
            .filter(Boolean).join('<span aria-hidden="true">·</span>')}</div>
          <span class="blog-card-arrow" aria-hidden="true">↗</span>
        </div>
      </div>
    </a>
  </article>`;
}

function topicsNav(selected) {
  return `<nav class="blog-topics" aria-label="Article topics">
    ${[{ slug: null, title: "All articles" }, ...BLOG_TOPICS].map(({ slug, title }) =>
      `<a href="${escape(blogListUrl(slug))}"${selected === slug ? ' aria-current="page"' : ""}>${escape(title)}</a>`
    ).join("")}
  </nav>`;
}

function pagination(topic, page, pages) {
  if (pages < 2) return "";
  return `<nav class="blog-pagination" aria-label="Blog pagination">
    ${page > 1 ? `<a rel="prev" href="${escape(blogListUrl(topic, page - 1))}">← Previous</a>` : "<span></span>"}
    <span>Page ${page} of ${pages}</span>
    ${page < pages ? `<a rel="next" href="${escape(blogListUrl(topic, page + 1))}">More articles →</a>` : "<span></span>"}
  </nav>`;
}

const BLOG_MASTHEAD_DOODLES = `<div class="blog-doodles" aria-hidden="true">
  <svg viewBox="0 0 56 56" focusable="false">
    <path d="m6 22 43-13-12 38-10-13-10 6 2-13Zm13 5L49 9 27 34M8 36l-4 5m10 3-4 6"/>
  </svg>
  <svg viewBox="0 0 56 56" focusable="false">
    <path d="m24 6 5 15 16 1-12 10 4 16-13-9-13 9 4-16L3 22l16-1ZM45 7v10m-5-5h10"/>
  </svg>
  <svg viewBox="0 0 56 56" focusable="false">
    <path d="M8 36c10 9 30 6 39-5 3-4 3-8 0-10-4-4-13-1-19 2-8 4-15 9-17 15M24 12c-10 4-12 13-9 22 3 10 14 15 23 10 9-4 12-15 8-24-3-8-13-12-22-8ZM7 14v8m-4-4h8m39 26v8m-4-4h8"/>
  </svg>
  <svg viewBox="0 0 56 56" focusable="false">
    <path d="M8 40c0-5 4-9 9-9 1-8 7-14 15-13 6 0 11 5 12 11 5 0 9 4 9 9 0 5-4 8-9 8H17c-5 0-9-2-9-6ZM5 15l5-4m3 9 7-2m-4-9 2-5"/>
  </svg>
  <svg viewBox="0 0 56 56" focusable="false">
    <path d="M29 6c1 13 6 18 18 21-12 2-17 7-19 20-2-13-7-18-19-20C22 25 26 19 29 6Zm16 1v10m-5-5h10M10 41v8m-4-4h8"/>
  </svg>
</div>`;

export function renderListing({ items, total, topic, page, pages = 1 }) {
  const articles = items.filter((article) => isArticleSlug(article.slug));
  const [featured, ...briefs] = !topic && page === 1 ? articles.splice(0, BLOG_SPOTLIGHT_SIZE) : [];
  const topicTitle = BLOG_TOPICS.find((item) => item.slug === topic)?.title;
  const grid = articles.length ? `<div class="blog-grid">${articles.map((article) => articleCard(article)).join("")}</div>` : "";
  const empty = !featured && !articles.length ? `<div class="blog-empty">
    <h2>${topic ? "No articles on this topic yet" : "The first issue is in the works"}</h2>
    <p>${topic
      ? 'Browse <a href="/blog">all articles</a> or choose another topic.'
      : 'In the meantime, explore <a href="/explore/user-onboarding">user onboarding</a> or <a href="/explore/analytics">product analytics</a>.'}</p>
  </div>` : "";
  return `<div class="section-shell blog-listing">
    <header class="blog-masthead">
      ${BLOG_MASTHEAD_DOODLES}
      <h1>Movcues Blog</h1>
      <p>${BLOG_DESCRIPTION}</p>
    </header>
    ${featured ? `<section class="blog-spotlight${briefs.length ? "" : " blog-spotlight--single"}" aria-label="Featured articles">
      ${articleCard(featured, "lead")}
      ${briefs.length ? `<div class="blog-briefs">${briefs.map((article) => articleCard(article, "brief")).join("")}</div>` : ""}
    </section>` : ""}
    <section class="blog-catalog" aria-labelledby="blog-catalog-title">
      <h2 id="blog-catalog-title">${escape(topicTitle ?? "Articles & insights")}</h2>
      ${topicsNav(topic)}
      ${grid}
      ${empty}
      ${pagination(topic, page, pages)}
    </section>
    ${total ? '<div class="blog-feed"><a href="/blog/feed.xml">RSS feed</a></div>' : ""}
  </div>`;
}

function safeLink(url) {
  if (typeof url !== "string" || !uriLooksSafe(url)) return "";
  if (url.startsWith("#")) return url;
  const parsed = URL.parse(url, BLOG_ORIGIN);
  if (!parsed || !["https:", "http:", "mailto:"].includes(parsed.protocol)) return "";
  if (url.startsWith("/") && parsed.origin !== BLOG_ORIGIN) return "";
  return url;
}

function renderBody(body) {
  const headings = [];
  if (!Array.isArray(body)) return { headings, html: "" };
  const ids = new Map();

  function heading({ children, value }, level) {
    const label = value.children?.map((item) => typeof item.text === "string" ? item.text : "").join("").trim();
    if (!label) return "";
    const slug = label.normalize("NFKD").replace(/\p{Mark}/gu, "")
      .toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "");
    const base = `section-${slug || "heading"}`;
    const occurrences = (ids.get(base) ?? 0) + 1;
    ids.set(base, occurrences);
    const id = `${base}${occurrences === 1 ? "" : `--${occurrences}`}`;
    headings.push({ id, label, level });
    return `<h${level} id="${escape(id)}">${children}</h${level}>`;
  }

  const html = toHTML(body, {
    onMissingComponent: false,
    components: {
      block: {
        h2: (props) => heading(props, 2),
        h3: (props) => heading(props, 3),
      },
      marks: {
        link: ({ children, value }) => {
          const href = safeLink(value?.href);
          return href ? `<a href="${escape(href)}">${children}</a>` : children;
        },
        code: ({ children }) => `<code>${children}</code>`,
      },
      types: {
        image: ({ value }) => {
          const image = coverImage(value, { inline: true });
          return image ? `<figure>${image}${value.caption ? `<figcaption>${escape(value.caption)}</figcaption>` : ""}</figure>` : "";
        },
        callout: ({ value }) => `<aside class="blog-answer">
          ${value.title ? `<strong>${escape(value.title)}</strong>` : ""}<p>${escape(value.text)}</p></aside>`,
        codeExample: ({ value }) => `<pre><code>${escape(value.code)}</code></pre>`,
      },
    },
  });
  return { headings, html };
}

export function renderArticle(article, related = [], draft = false) {
  const topic = topicFor(article);
  const { html, headings } = renderBody(article.body);
  const image = coverImage(article.cover, { lead: true });
  const authorUrl = safeLink(article.authorUrl);
  const toc = headings.length > 1 ? `<nav class="blog-toc" aria-label="Article contents">
    <p>On this page</p>
    <ul>${headings.map(({ id, label, level }) =>
      `<li class="blog-toc-level-${level}"><a href="#${escape(id)}">${escape(label)}</a></li>`
    ).join("")}</ul>
  </nav>` : "";
  return `<div class="section-shell blog-article">
    <nav class="blog-crumbs" aria-label="Breadcrumb">
      <a href="/blog">Blog</a>
      ${topic ? `<span aria-hidden="true">/</span><a href="${blogListUrl(topic.slug)}">${escape(topic.title)}</a>` : ""}
    </nav>
    ${draft ? '<p class="blog-preview">Draft preview <a href="/blog/preview/disable">Exit preview</a></p>' : ""}
    <article>
      <header class="blog-article-header">
        <h1>${escape(article.title)}</h1>
        <p class="blog-article-deck">${escape(article.summary)}</p>
        <div class="blog-byline">
          ${article.author ? `<span class="blog-author">${authorUrl
            ? `<a href="${escape(authorUrl)}" rel="author">${escape(article.author)}</a>`
            : escape(article.author)}</span>` : ""}
          <div class="blog-meta">${articleMeta(article)}</div>
        </div>
      </header>
      ${image ? `<figure class="blog-cover">${image}${article.cover.caption ? `<figcaption>${escape(article.cover.caption)}</figcaption>` : ""}</figure>` : ""}
      <div class="blog-reading${toc ? " blog-reading--toc" : ""}">
        ${toc}
        <div class="blog-prose">
          ${article.answer ? `<aside class="blog-answer"><strong>Quick answer</strong><p>${escape(article.answer)}</p></aside>` : ""}
          ${html}
          ${topic ? `<p class="blog-product-link"><a href="${topic.href}">${escape(topic.link)} in Movcues <span aria-hidden="true">→</span></a></p>` : ""}
        </div>
      </div>
    </article>
    ${related.some((item) => isArticleSlug(item.slug)) ? `<section class="blog-recent blog-related" aria-labelledby="related-title">
      <h2 id="related-title">Related articles</h2><div class="blog-grid">${related.filter((item) => isArticleSlug(item.slug))
        .map((item) => articleCard(item)).join("")}</div>
    </section>` : ""}
  </div>`;
}

export function renderMessage(title, message) {
  return `<div class="section-shell blog-message"><h1>${escape(title)}</h1>
    <p>${escape(message)}</p><a href="/blog">Browse the blog →</a></div>`;
}

function scriptJson(data) {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function listingSeo(topic, page) {
  const topicLabel = BLOG_TOPICS.find((item) => item.slug === topic)?.title;
  const title = topicLabel ? `${topicLabel} | Movcues Blog` : BLOG_TITLE;
  return {
    title: page === 1 ? title : `${title} – Page ${page}`,
    description: BLOG_DESCRIPTION,
    canonical: absolute(blogListUrl(topic, page)),
    robots: topic ? "noindex, follow" : "index, follow",
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: "Movcues Blog",
  };
}

export function articleSeo(article) {
  const canonical = absolute(articlePath(article.slug));
  const image = imageUrl(article.cover, 1200) || DEFAULT_SOCIAL_IMAGE;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: article.summary,
        mainEntityOfPage: canonical,
        url: canonical,
        inLanguage: "en",
        image: [image],
        author: {
          "@type": "Person", name: article.author,
          ...(article.authorUrl?.startsWith("https://") && safeLink(article.authorUrl) ? { url: article.authorUrl } : {}),
        },
        publisher: { "@type": "Organization", name: "Movcues", url: BLOG_ORIGIN },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BLOG_ORIGIN + "/" },
          { "@type": "ListItem", position: 2, name: "Blog", item: absolute(BLOG_PATH) },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical },
        ],
      },
    ],
  };
  return {
    title: article.seoTitle ? `${article.seoTitle} | Movcues Blog` : `${article.title} | Movcues Blog`,
    description: article.seoDescription || article.summary,
    canonical,
    robots: "index, follow",
    image,
    imageAlt: article.cover?.alt || "Movcues Blog",
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    data,
  };
}

export function additionalHead(seo, draft) {
  const meta = (name, value) => value ? `<meta property="${name}" content="${escape(value)}">` : "";
  return [
    !draft && '<link rel="alternate" type="application/rss+xml" title="Movcues Blog" href="/blog/feed.xml">',
    meta("og:image", seo.image),
    meta("og:image:alt", seo.imageAlt),
    seo.image && `<meta name="twitter:image" content="${escape(seo.image)}">`,
    seo.imageAlt && `<meta name="twitter:image:alt" content="${escape(seo.imageAlt)}">`,
    meta("article:published_time", seo.publishedAt),
    meta("article:modified_time", seo.updatedAt),
    !draft && seo.data && `<script type="application/ld+json">${scriptJson(seo.data)}</script>`,
  ].filter(Boolean).join("");
}

export function blogSitemap(articles) {
  const entries = articles.filter((article) => isArticleSlug(article.slug)).map((article) =>
    `<url><loc>${escape(absolute(articlePath(article.slug)))}</loc>${article.updatedAt
      ? `<lastmod>${escape(article.updatedAt)}</lastmod>` : ""}</url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${absolute(BLOG_PATH)}</loc></url>${entries.join("")}</urlset>`;
}

export function blogFeed(articles) {
  const entries = articles.filter((article) => isArticleSlug(article.slug)).map((article) =>
    `<item><title>${escape(article.title)}</title><link>${escape(absolute(articlePath(article.slug)))}</link>
      <guid>${escape(absolute(articlePath(article.slug)))}</guid><description>${escape(article.summary)}</description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate></item>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel><title>Movcues Blog</title><link>${absolute(BLOG_PATH)}</link><description>${escape(BLOG_DESCRIPTION)}</description>
      <atom:link href="${absolute("/blog/feed.xml")}" rel="self" type="application/rss+xml" />${entries.join("")}</channel></rss>`;
}

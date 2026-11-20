import assert from "node:assert/strict";
import test from "node:test";
import { blogPageCount, blogPageRange, isArticleSlug } from "../src/blog/config.mjs";
import { additionalHead, articleSeo, blogFeed, blogSitemap, listingSeo, renderArticle, renderListing } from "../src/blog/render.mjs";
import { listArticles } from "../src/blog/content.mjs";

test("dynamic categories render alongside legacy topics and preserve article URLs", async () => {
  const categories = [{ slug: "retention", title: "Retention", count: 1 }];
  const item = { slug: "existing-article", title: "Article", summary: "Summary", topic: "retention", category: categories[0], body: [] };
  const html = renderListing({ items: [item], total: 1, topic: "retention", page: 1, categories });
  assert.match(html, /Retention/);
  assert.match(html, /\/blog\/existing-article/);
  assert.match(html, /topic=onboarding/);
  assert.match(renderArticle(item), /topic=retention/);
  assert.match(listingSeo("retention", 1, categories).title, /Retention/);
  let query; await listArticles({ fetch: q => { query = q; return { total: 0, items: [] }; } }, "retention", 1);
  assert.match(query, /coalesce\(primaryCategory->slug.current, topic\)/);
});
import { inPreview } from "../src/blog/preview.mjs";

const block = (_key, text, style = "normal", markDefs = [], marks = []) => ({
  _type: "block", _key, style, markDefs, children: [{ _type: "span", _key: "span", text, marks }],
});
const article = {
  title: "Activation & first value",
  summary: "Learn where users stall.",
  slug: "first-value",
  topic: "onboarding",
  author: "Rush",
  publishedAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
  body: [
    block("a", "Find the drop-off", "h2"),
    block("b", "Inspect the conversion funnel."),
    block("c", "Find the drop-off", "h2"),
  ],
};

test("the blog renders crawlable article and pagination links", () => {
  const result = renderListing({ items: [article], total: 20, topic: null, page: 1, pages: 2 });
  assert.match(result, /href="\/blog\/first-value"/);
  assert.match(result, /rel="next" href="\/blog\?page=2"/);
  assert.match(result, /Activation &amp; first value/);
  assert.equal(listingSeo(null, 2).canonical, "https://movcues.com/blog?page=2");
  assert.match(listingSeo("onboarding", 1).robots, /noindex/);
});

test("article HTML includes a table of contents and unique section anchors", () => {
  const html = renderArticle(article);
  assert.match(html, /aria-label="Article contents"/);
  assert.match(html, /href="#section-find-the-drop-off"/);
  assert.match(html, /id="section-find-the-drop-off--2"/);
  assert.match(html, /Inspect the conversion funnel/);
});

test("CMS text cannot close JSON-LD scripts or insert unsafe links and images", () => {
  const unsafe = {
    ...article,
    title: '</script><script>alert("test")</script>',
    cover: { url: "https://example.net/fake.jpg" },
    body: [
      block("a", "<svg onload=alert(1)>", "normal", [{ _key: "link", _type: "link", href: "javascript:alert(1)" }], ["link"]),
      { _type: "image", _key: "b", url: "http://[" },
    ],
  };
  const body = renderArticle(unsafe);
  assert.doesNotMatch(body, /<svg|javascript:|example.net/);
  assert.match(body, /&lt;svg/);
  const head = additionalHead(articleSeo(unsafe), false);
  assert.equal(head.match(/<\/script>/g)?.length, 1);
  const schema = JSON.parse(head.match(/<script type="application\/ld\+json">(.*)<\/script>/)[1]);
  assert.equal(schema["@graph"][0].headline, unsafe.title);
  assert.doesNotMatch(additionalHead(articleSeo(unsafe), true), /application\/ld\+json/);
});

test("discovery endpoints link to canonical article URLs and skip reserved slugs", () => {
  const inputs = [article, { ...article, slug: "preview" }];
  assert.equal(isArticleSlug("preview"), false);
  assert.equal(isArticleSlug("../elsewhere"), false);
  assert.match(blogSitemap(inputs), /<loc>https:\/\/movcues.com\/blog\/first-value<\/loc>/);
  assert.doesNotMatch(blogSitemap(inputs), /\/preview/);
  assert.match(blogFeed(inputs), /Activation &amp; first value/);
  assert.doesNotMatch(blogFeed(inputs), /\/preview/);
});

test("arbitrary preview cookies do not grant draft access", async () => {
  const forged = Math.ceil(Date.now() / 1000 + 600) + "." + "ab".repeat(32);
  const request = new Request("https://movcues.com/blog/first-value", {
    headers: { Cookie: "movcues_blog_preview=" + forged },
  });
  assert.equal(await inPreview(request, { SANITY_PREVIEW_TOKEN: "test.token.preview" }), false);
});

test("the home page renders four unique spotlight articles and eight grid articles", () => {
  const cover = { url: "https://cdn.sanity.io/images/project/production/cover-1200x800.jpg", alt: "Sanity cover", width: 1200, height: 800 };
  const items = Array.from({ length: 12 }, (_, index) => ({ ...article, slug: "post-" + index, cover }));
  const html = renderListing({ items, total: 13, topic: null, page: 1, pages: 2 });
  assert.equal((html.match(/blog-card--lead/g) ?? []).length, 1);
  assert.equal((html.match(/blog-card--brief/g) ?? []).length, 3);
  assert.equal((html.match(/blog-card--standard/g) ?? []).length, 8);
  assert.equal(new Set(html.match(/href="\/blog\/post-\d+"/g)).size, 12);
  assert.match(html, /alt="Sanity cover"/);
  assert.match(html, /fetchpriority="high"/);

  for (const topic of [null, "onboarding"]) {
    const filtered = renderListing({ items: items.slice(0, 8), total: 20, topic, page: topic ? 1 : 2, pages: 2 });
    assert.doesNotMatch(filtered, /class="blog-spotlight/);
    assert.equal(blogPageRange(topic, 1).end, blogPageRange(topic, 2).start);
  }
  assert.equal(blogPageCount(12, null), 1);
  assert.equal(blogPageCount(13, null), 2);
  assert.equal(blogPageCount(9, "onboarding"), 2);
});

test("a single article without a cover still renders a lead story", () => {
  const html = renderListing({ items: [article], total: 1, topic: null, page: 1 });
  assert.match(html, /blog-spotlight--single/);
  assert.match(html, /blog-card--lead blog-card--text/);
  assert.doesNotMatch(html, /blog-empty|blog-briefs|blog-card-image/);
});

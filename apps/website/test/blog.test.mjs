import assert from "node:assert/strict";
import test from "node:test";
import { isArticleSlug } from "../src/blog/config.mjs";
import { additionalHead, articleSeo, blogFeed, blogSitemap, listingSeo, renderArticle, renderListing } from "../src/blog/render.mjs";
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

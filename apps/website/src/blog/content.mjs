import { createClient } from "@sanity/client";
import { blogPageRange } from "./config.mjs";

const ARTICLE_TYPE = '_type == "blogPost" && defined(slug.current)';
const VISIBLE_ARTICLE = `${ARTICLE_TYPE} && dateTime(publishedAt) <= dateTime(now())`;
const IMAGE_FIELDS = `
  alt, caption,
  "url": asset->url,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height
`;
const SUMMARY_FIELDS = `
  _id, title, "slug": slug.current, summary, author,
  "topic": coalesce(primaryCategory->slug.current, topic),
  "category": primaryCategory->{title, "slug": slug.current}, topicTags, publishedAt,
  "updatedAt": _updatedAt, "bodyLength": length(pt::text(body)),
  cover{${IMAGE_FIELDS}}
`;
const ARTICLE_FIELDS = `
  ${SUMMARY_FIELDS},
  authorUrl, answer, seoTitle, seoDescription,
  body[]{
    ...,
    _type == "image" => {${IMAGE_FIELDS}}
  }
`;

export function blogClient(env, draft = false) {
  const { SANITY_PROJECT_ID: projectId, SANITY_DATASET: dataset } = env;
  if (!projectId && !dataset && !draft) return null;
  return createClient({
    projectId,
    dataset,
    ...(draft ? { token: env.SANITY_PREVIEW_TOKEN }
      : env.SANITY_READ_TOKEN ? { token: env.SANITY_READ_TOKEN } : {}),
    apiVersion: "2026-11-01",
    useCdn: false,
    perspective: draft ? "drafts" : "published",
  });
}

const requestOptions = () => ({ signal: AbortSignal.timeout(4500) });

export async function listArticles(client, topic, page) {
  if (!client) return { total: 0, items: [] };
  const filter = `${VISIBLE_ARTICLE} && ($topic == null || coalesce(primaryCategory->slug.current, topic) == $topic)`;
  const order = topic ? "publishedAt desc, _id asc" : "coalesce(featured, false) desc, publishedAt desc, _id asc";
  const { start, end } = blogPageRange(topic, page);
  return client.fetch(`{
    "total": count(*[${filter}]),
    "items": *[${filter}] | order(${order})[${start}...${end}]{${SUMMARY_FIELDS}}
  }`, { topic }, requestOptions());
}

export async function getArticle(client, slug, draft) {
  if (!client) return null;
  const filter = draft ? ARTICLE_TYPE : VISIBLE_ARTICLE;
  return client.fetch(`*[${filter} && slug.current == $slug][0]{${ARTICLE_FIELDS}}`, { slug }, requestOptions());
}

export async function relatedArticles(client, article) {
  return client.fetch(`
    *[${VISIBLE_ARTICLE} && slug.current != $slug && coalesce(primaryCategory->slug.current, topic) == $topic]
    | order(publishedAt desc, _id asc)[0...3]{${SUMMARY_FIELDS}}
  `, { slug: article.slug, topic: article.topic ?? null }, requestOptions());
}

export async function listCategories(client) {
  if (!client) return [];
  return client.fetch(`*[_type == "blogCategory" && active != false && defined(slug.current)] | order(order asc, title asc) {
    title, "slug": slug.current,
    "count": count(*[${VISIBLE_ARTICLE} && primaryCategory._ref == ^._id])
  }`, {}, requestOptions());
}

export async function sitemapArticles(client) {
  if (!client) return [];
  return client.fetch(`
    *[${VISIBLE_ARTICLE}]{"slug": slug.current, "updatedAt": _updatedAt}
  `, {}, requestOptions());
}

export async function feedArticles(client) {
  if (!client) return [];
  return client.fetch(`
    *[${VISIBLE_ARTICLE}] | order(publishedAt desc, _id asc)[0...20]{
      "slug": slug.current, title, summary, publishedAt
    }
  `, {}, requestOptions());
}

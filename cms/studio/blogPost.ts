import { defineArrayMember, defineField, defineType } from "sanity";
import { BLOG_TOPICS, isArticleSlug } from "../../apps/website/src/blog/config.mjs";

const imageFields = [
  defineField({
    name: "alt",
    title: "Alt text",
    type: "string",
    validation: (rule) => rule.required().max(180),
  }),
  defineField({ name: "caption", title: "Caption", type: "string", validation: (rule) => rule.max(300) }),
];

export const blogPost = defineType({
  name: "blogPost",
  title: "Article",
  type: "document",
  groups: [
    { name: "article", title: "Article", default: true },
    { name: "search", title: "Search and sharing" },
  ],
  fields: [
    defineField({
      name: "title", title: "Title", type: "string", group: "article",
      validation: (rule) => rule.required().max(130),
    }),
    defineField({
      name: "slug", title: "URL slug", type: "slug", group: "article",
      description: "This becomes the public URL. Keep it stable after publishing.",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom((value) =>
        !value || isArticleSlug(value.current) || "Use lowercase letters, numbers, and single hyphens. The slug preview is reserved."),
    }),
    defineField({
      name: "summary", title: "Summary", type: "text", rows: 3, group: "article",
      description: "Appears on article cards and below the headline.",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: "author", title: "Author name", type: "string", group: "article",
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: "authorUrl", title: "Author profile URL", type: "url", group: "article",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "topic", title: "Topic", type: "string", group: "article",
      options: { list: BLOG_TOPICS.map(({ slug, title }) => ({ value: slug, title })), layout: "radio" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt", title: "Publication date", type: "datetime", group: "article",
      description: "Set the date shown to readers. The post appears once it is published and this date has passed.",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "featured", title: "Feature on the blog homepage", type: "boolean", group: "article",
      description: "The newest featured article takes the lead position.",
      initialValue: false,
    }),
    defineField({
      name: "cover", title: "Cover image", type: "image", group: "article", fields: imageFields,
      validation: (rule) => rule.custom((value) => !value || !!value.asset || "Upload an image or remove the empty cover."),
    }),
    defineField({
      name: "answer", title: "Quick answer", type: "text", rows: 3, group: "article",
      description: "Optional direct answer to the question the article addresses.",
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: "body", title: "Article body", type: "array", group: "article",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Paragraph", value: "normal" },
            { title: "Heading", value: "h2" },
            { title: "Subheading", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [{ title: "Bullets", value: "bullet" }, { title: "Numbered list", value: "number" }],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" }, { title: "Italic", value: "em" }, { title: "Code", value: "code" },
            ],
            annotations: [
              defineArrayMember({
                name: "link", title: "Link", type: "object",
                fields: [defineField({
                  name: "href", title: "URL", type: "url",
                  validation: (rule) => rule.required().uri({ allowRelative: true, scheme: ["http", "https", "mailto"] }),
                })],
              }),
            ],
          },
        }),
        defineArrayMember({ type: "image", title: "Image", fields: imageFields, validation: (rule) => rule.assetRequired() }),
        defineArrayMember({
          name: "callout", title: "Callout", type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "text", title: "Text", type: "text", rows: 3, validation: (rule) => rule.required() }),
          ],
        }),
        defineArrayMember({
          name: "codeExample", title: "Code example", type: "object",
          fields: [defineField({ name: "code", title: "Code", type: "text", rows: 8, validation: (rule) => rule.required() })],
        }),
      ],
    }),
    defineField({
      name: "seoTitle", title: "Search title", type: "string", group: "search",
      description: "Defaults to the article title. Movcues Blog is appended automatically.",
      validation: (rule) => rule.max(65),
    }),
    defineField({
      name: "seoDescription", title: "Search description", type: "text", rows: 2, group: "search",
      description: "Defaults to the article summary.",
      validation: (rule) => rule.max(170),
    }),
  ],
  preview: { select: { title: "title", subtitle: "summary", media: "cover" } },
});

import { defineField, defineType } from "sanity";

export const blogCategory = defineType({
  name: "blogCategory", title: "Blog category", type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: rule => rule.required().max(100) }),
    defineField({ name: "slug", type: "slug", options: { source: "title", maxLength: 96 }, validation: rule => rule.required().custom(value => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || "Use lowercase words separated by hyphens") }),
    defineField({ name: "description", type: "text" }),
    defineField({ name: "order", type: "number" }),
    defineField({ name: "active", type: "boolean", initialValue: true }),
  ],
});

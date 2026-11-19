import { useState } from "react";
import { createPreviewSecret } from "@sanity/preview-url-secret/create-secret";
import { urlSearchParamPreviewPathname, urlSearchParamPreviewSecret } from "@sanity/preview-url-secret";
import { useToast } from "@sanity/ui/toast";
import { defineConfig, useClient, type DocumentActionComponent } from "sanity";
import { structureTool } from "sanity/structure";
import { BLOG_ORIGIN, isArticleSlug } from "../../apps/website/src/blog/config.mjs";
import { blogPost } from "./blogPost";

const blogOrigin = process.env.SANITY_STUDIO_BLOG_ORIGIN || BLOG_ORIGIN;
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId) throw new Error("Set SANITY_STUDIO_PROJECT_ID before starting Movcues Blog Studio.");

const BlogPreview: DocumentActionComponent = ({ draft, published }) => {
  const client = useClient({ apiVersion: "2026-11-01" });
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const slug = (draft ?? published)?.slug as { current?: string } | undefined;
  return {
    label: "Preview blog article",
    disabled: opening || !isArticleSlug(slug?.current),
    onHandle: async () => {
      const tab = window.open("about:blank", "_blank");
      if (!tab) {
        toast.push({ status: "warning", title: "Allow pop-ups to open the article preview." });
        return;
      }
      tab.opener = null;
      setOpening(true);
      try {
        const { secret } = await createPreviewSecret(client, "movcues-blog-studio", window.location.href);
        const url = new URL("/blog/preview/enable", blogOrigin);
        url.searchParams.set(urlSearchParamPreviewSecret, secret);
        url.searchParams.set(urlSearchParamPreviewPathname, `/blog/${slug?.current}`);
        tab.location.replace(url.href);
      } catch {
        tab.close();
        toast.push({ status: "error", title: "Couldn’t open the article preview. Try again." });
      } finally {
        setOpening(false);
      }
    },
  };
};

export default defineConfig({
  name: "movcues-blog",
  title: "Movcues Blog",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool()],
  schema: { types: [blogPost] },
  document: {
    actions: (actions, { schemaType }) => schemaType === "blogPost" ? [...actions, BlogPreview] : actions,
  },
});

const configuredPreviewUrl = import.meta.env.VITE_THEME_PREVIEW_URL?.trim();
export const useLocalPreview = import.meta.env.DEV && !configuredPreviewUrl;
export const localPreviewUrl = "/__movcues/sdk-theme-preview.min.js";
export const previewScript = (() => {
  if (useLocalPreview) return localPreviewUrl;
  const url = new URL(configuredPreviewUrl || "https://cdn.movcues.com/sdk-theme-preview.min.js");
  if (url.protocol !== "https:" && !(import.meta.env.DEV && url.protocol === "http:")) throw new Error("Invalid theme preview URL");
  return url.href.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
})();

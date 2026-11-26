export const geoAgentPages = [
  { id: "overview", label: "Overview", path: "/experiences/geo-agents" },
  { id: "skills", label: "Skills", path: "/experiences/geo-agents/skills" },
  { id: "behaviour", label: "Behaviour", path: "/experiences/geo-agents/behaviour" },
  { id: "knowledge", label: "Knowledge", path: "/knowledge" },
  { id: "conversations", label: "Conversations", path: "/experiences/geo-agents/conversations" },
  { id: "appearance", label: "Appearance", path: "/experiences/geo-agents/appearance" },
] as const;

export type GeoAgentSection = (typeof geoAgentPages)[number]["id"];

export function geoAgentSection(pathname: string): GeoAgentSection | undefined {
  const path = pathname.replace(/\/$/, "").toLowerCase();
  return geoAgentPages.find(page => page.path === path)?.id;
}

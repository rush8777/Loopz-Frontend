import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import type { Experience } from "@/types/experiences";
import type { GeoAgentDefinition } from "@/types/geoAgent";
import { GeoAgentDashboard } from "./GeoAgentDashboard";
import { geoAgentPages } from "@/lib/geoAgentNavigation";

const api = vi.hoisted(() => ({
  list: vi.fn(), create: vi.fn(), update: vi.fn(), publish: vi.fn(), pause: vi.fn(), segments: vi.fn(), sources: vi.fn(), skills: vi.fn(), metrics: vi.fn(),
}));
const workspace = vi.hoisted(() => ({ orgId: "org", siteId: "site-a", role: "OWNER" }));

vi.mock("@/auth/WorkspaceContext", () => ({ useWorkspace: () => ({
  currentOrg: { orgId: workspace.orgId, role: workspace.role }, currentSite: { id: workspace.siteId, name: workspace.siteId },
}) }));
vi.mock("@/api/experiences", () => ({ listExperiences: api.list, createExperience: api.create, updateExperience: api.update, publishExperience: api.publish, pauseExperience: api.pause }));
vi.mock("@/api/segments", () => ({ listSegments: api.segments }));
vi.mock("@/api/knowledge", () => ({ knowledgeApi: () => ({ list: api.sources }) }));
vi.mock("@/api/agentSkills", async importOriginal => ({
  ...await importOriginal<typeof import("@/api/agentSkills")>(), agentSkills: () => ({ list: api.skills }),
}));
vi.mock("@/api/geoAgent", () => ({ getGeoAgentMetrics: api.metrics, previewGeoAgent: vi.fn() }));

const time = "2026-01-01T00:00:00.000Z";

function agent(id: string, name: string, siteId = "site-a", status: Experience["status"] = "draft"): Experience {
  const definition: GeoAgentDefinition = {
    geoAgent: { schemaVersion: 1, enabled: true, showLauncher: true, persistence: "tab", sourceIds: [],
      instructions: "", fallback: "Try again", appearance: { name, brandColor: "#123456", theme: "system", launcher: "icon", launcherLabel: "Ask Geo", position: "bottom-right", welcome: "How can I help?", placeholder: "Ask", suggestions: [] } },
    targeting: { pageRules: [], audience: { type: "all" }, trigger: { type: "page_load" }, frequency: { mode: "every_time" }, priority: 0 },
  };
  const draftVersion = { id: `draft-${id}`, experienceId: id, versionNumber: 1, revision: 1, state: "draft" as const, definition, createdBy: "user", createdAt: time, publishedAt: null };
  const publishedVersion = status === "draft" ? null : { ...draftVersion, id: `published-${id}`, state: "published" as const, publishedAt: time };
  return { id, siteId, name, status, kind: "widget", widgetType: "geo_agent", builderMode: "geo_agent", buildPageId: null, buildUrl: null,
    createdBy: "user", createdAt: time, updatedAt: time, publishedVersionId: publishedVersion?.id ?? null, draftVersion, publishedVersion };
}

const page = (initialPath = geoAgentPages[0].path as string) => <MemoryRouter initialEntries={[initialPath]}>
  <nav>{geoAgentPages.map(item => <Link key={item.id} to={item.path}>{item.label}</Link>)}</nav>
  <Routes><Route element={<GeoAgentDashboard />}>
    {geoAgentPages.map(item => <Route key={item.id} path={item.path} element={null} />)}
  </Route></Routes>
</MemoryRouter>;

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(workspace, { orgId: "org", siteId: "site-a", role: "OWNER" });
  api.segments.mockResolvedValue({ segments: [] });
  api.sources.mockResolvedValue([]);
  api.skills.mockResolvedValue({ skills: [] });
  api.metrics.mockResolvedValue(null);
});

it("sets up the first agent once, then opens its editor in place", async () => {
  api.list.mockResolvedValue({ experiences: [] });
  const created = agent("new", "Billing helper");
  let finish!: (value: Experience) => void;
  api.create.mockReturnValue(new Promise<Experience>(resolve => { finish = resolve; }));
  render(page());

  const setup = await screen.findByRole("button", { name: "Set up Geo Agent" });
  fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "  Billing helper  " } });
  fireEvent.click(setup);
  fireEvent.click(setup);
  expect(api.create).toHaveBeenCalledExactlyOnceWith("org", "site-a", {
    name: "Billing helper", kind: "widget", widgetType: "geo_agent", builderMode: "geo_agent", template: "blank", useBuildPageAsTarget: false,
  });
  await act(async () => finish(created));
  expect(await screen.findByRole("heading", { name: "Billing helper" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Set up Geo Agent" })).toBeNull();
  expect(api.publish).not.toHaveBeenCalled();
});

it("opens the agent created by another administrator and keeps setup hidden from viewers", async () => {
  api.list.mockResolvedValueOnce({ experiences: [] }).mockResolvedValueOnce({ experiences: [agent("existing", "Billing")] });
  api.create.mockRejectedValue(new ApiError(409, { error: "geo_agent_exists" }));
  const view = render(page());
  fireEvent.click(await screen.findByRole("button", { name: "Set up Geo Agent" }));
  expect(await screen.findByRole("heading", { name: "Billing" })).toBeVisible();
  expect(api.list).toHaveBeenCalledTimes(2);

  workspace.role = "VIEWER";
  workspace.siteId = "site-b";
  api.list.mockResolvedValue({ experiences: [] });
  view.rerender(page());
  expect(await screen.findByText("A workspace administrator can set up the assistant for this site.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Set up Geo Agent" })).toBeNull();
});

it("selects a stable primary without exposing legacy agents and ignores responses from a previous site", async () => {
  const primary = agent("a", "Primary");
  const legacy = { ...agent("b", "Existing live agent", "site-a", "published"), updatedAt: "2026-11-01T00:00:00.000Z" };
  api.list.mockResolvedValueOnce({ experiences: [legacy, primary] });
  let finish!: (value: { experiences: Experience[] }) => void;
  api.list.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  api.list.mockResolvedValueOnce({ experiences: [agent("site-c-agent", "Another site’s agent", "site-c")] });
  const view = render(page());

  expect(await screen.findByRole("heading", { name: "Primary" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Review & publish" }));
  expect(await screen.findByText(/Another Geo Agent is published on this site/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText(/This site also has legacy agents/)).toBeVisible();
  expect(screen.queryByText("Existing live agent")).toBeNull();
  expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
  expect(api.update).not.toHaveBeenCalled();
  expect(api.pause).not.toHaveBeenCalled();

  workspace.siteId = "site-b";
  view.rerender(page());
  expect(screen.queryByRole("heading", { name: "Existing live agent" })).toBeNull();
  workspace.siteId = "site-c";
  view.rerender(page());
  expect(await screen.findByRole("heading", { name: "Another site’s agent" })).toBeVisible();
  await act(async () => finish({ experiences: [agent("stale", "Stale agent", "site-b")] }));
  expect(screen.queryByRole("heading", { name: "Stale agent" })).toBeNull();
  expect(api.list).toHaveBeenLastCalledWith("org", "site-c", "widget", "geo_agent");
});

it("retains unsaved changes across pages, reuses Knowledge, and publishes one reviewed revision", async () => {
  const draft = agent("a", "Primary");
  api.list.mockResolvedValue({ experiences: [draft] });
  api.segments.mockResolvedValue({ segments: [{ id: "pro", name: "Pro members" }, { id: "beta", name: "Beta users" }] });
  api.sources.mockResolvedValue(["Docs", "FAQs"].map(name => ({ id: name, name, visibility: "public", enabled: true, status: "ready" })));
  api.skills.mockResolvedValue({ skills: ["Invoices", "Teams"].map(name => ({ id: name, guideId: name, enabled: true, status: "ready", metadata: { name, description: name, keywords: [] } })) });
  api.update.mockImplementation(async (_org, _site, _id, { definition }) => ({ ...draft, draftVersion: { ...draft.draftVersion, revision: 2, definition } }));
  api.publish.mockResolvedValue({ ...draft, status: "published" });
  api.metrics.mockResolvedValue({ conversations: 4, visitors: 2, messages: 5, responses: 5, failed: 0, helpful: 1,
    unhelpful: 0, answeredWithKnowledge: 5, tokens: 50, averageLatencyMs: 60, averageFirstDeltaMs: 30 });
  render(page("/experiences/geo-agents/appearance"));

  const open = (name: string) => fireEvent.click(screen.getByRole("link", { name }));
  fireEvent.change(await screen.findByLabelText("Assistant name"), { target: { value: "Invoice support" } });
  open("Knowledge");
  expect(await screen.findByRole("button", { name: "Add source" })).toBeVisible();
  for (const name of [/Docs/, /FAQs/]) fireEvent.click(await screen.findByRole("checkbox", { name }));
  open("Skills");
  for (const name of [/Invoices/, /Teams/]) fireEvent.click(await screen.findByRole("checkbox", { name }));
  open("Behaviour");
  fireEvent.change(screen.getByLabelText("Page paths, one per line"), { target: { value: "/billing\n/settings" } });
  fireEvent.change(screen.getByLabelText("Who should see this?"), { target: { value: "segment_rules" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Segment rule" }));
  fireEvent.click(screen.getByRole("button", { name: "Add Segment rule" }));
  fireEvent.change(screen.getByLabelText("Match"), { target: { value: "any" } });
  fireEvent.change(screen.getByLabelText("Segment rule 2 segment"), { target: { value: "beta" } });
  fireEvent.change(screen.getByLabelText("Segment rule 2 operator"), { target: { value: "not_matches" } });
  fireEvent.change(screen.getByLabelText(/Visitor identity public key/), { target: { value: "test-public-key" } });
  open("Conversations");
  expect(await screen.findByText("60 ms")).toBeVisible();
  expect(api.metrics).toHaveBeenCalledExactlyOnceWith("org", "site-a", "a");
  open("Appearance");
  expect(screen.getByLabelText("Assistant name")).toHaveValue("Invoice support");
  open("Knowledge");
  expect(await screen.findByRole("checkbox", { name: /Docs/ })).toBeChecked();
  expect(api.update).not.toHaveBeenCalled();
  expect(api.list).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Review & publish" }));
  const review = await screen.findByRole("dialog", { name: "Publish Primary?" });
  expect(api.update).toHaveBeenCalledExactlyOnceWith("org", "site-a", "a", { revision: 1, definition: expect.objectContaining({
    geoAgent: expect.objectContaining({ appearance: expect.objectContaining({ name: "Invoice support" }), sourceIds: ["Docs", "FAQs"], skillIds: ["Invoices", "Teams"], identityPublicKey: "test-public-key" }),
    targeting: expect.objectContaining({ pageRules: [expect.objectContaining({ value: "/billing" }), expect.objectContaining({ value: "/settings" })],
      audience: { type: "segment_rules", logic: "any", conditions: [expect.objectContaining({ segmentId: "pro", operator: "matches" }), expect.objectContaining({ segmentId: "beta", operator: "not_matches" })] } }),
  }) });
  fireEvent.click(within(review).getByRole("button", { name: "Publish now" }));
  await waitFor(() => expect(api.publish).toHaveBeenCalledExactlyOnceWith("org", "site-a", "a", { draftVersionId: "draft-a", revision: 2 }));
  expect(await screen.findByText("Geo Agent published.")).toBeVisible();
});

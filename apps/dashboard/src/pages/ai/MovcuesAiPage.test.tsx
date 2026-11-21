import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovcuesAiPage } from "./MovcuesAiPage";
import { AppShell } from "@/components/AppShell";
import * as auth from "@/auth/AuthContext";
import * as workspace from "@/auth/WorkspaceContext";
import * as aiApi from "@/api/ai";

vi.mock("@/auth/AuthContext");
vi.mock("@/auth/WorkspaceContext");
vi.mock("@/api/ai");

const conversation = { id: "aic_1", orgId: "org_1", siteId: "site_1", userId: "usr_1", title: "New conversation", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const assistant = { id: "aim_2", role: "assistant" as const, content: "## Performance\n\n| Metric | Result |\n| --- | --- |\n| Active users | 42 |\n\nNo activity yet.", contentBlocks: [{ type: "metrics" as const, metrics: [{ label: "Active users", value: 42, format: "number" as const, previousValue: 35, deltaPercent: 20 }] }], evidence: [{ source: "analytics.query", label: "Product metrics" }], proposal: null, approval: null, createdAt: new Date().toISOString() };

describe("Geo page", () => {
  beforeEach(() => {
    vi.mocked(auth.useAuth).mockReturnValue({ user: { id: "usr_1", name: "Sam Lee", email: "sam@example.com" } } as never);
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1", name: "Org", role: "OWNER" }, currentSite: { id: "site_1", siteId: "public_1", name: "Site", domain: null }, loading: false } as never);
    vi.mocked(aiApi.getAiStatus).mockResolvedValue({ enabled: true, provider: "vertex", model: "gemini-test" });
    vi.mocked(aiApi.listAiConversations).mockResolvedValue({ conversations: [] });
    vi.mocked(aiApi.createAiConversation).mockResolvedValue(conversation);
    vi.mocked(aiApi.sendAiMessage).mockResolvedValue({ userMessage: { ...assistant, id: "aim_1", role: "user", content: "What changed?", evidence: [] }, assistantMessage: assistant });
  });

  it("shows the welcome workspace in the full dashboard pane", async () => {
    render(
      <MemoryRouter initialEntries={["/ai"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/ai" element={<MovcuesAiPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const main = screen.getByRole("main");
    const background = main.querySelector(".geo-welcome-background");
    const heading = await screen.findByRole("heading", { name: "Welcome back, Sam" });
    expect(main).toHaveAttribute("class", "w-full");
    expect(background?.parentElement).toBe(main.firstElementChild);
    expect(background?.nextElementSibling).toContainElement(heading);
    expect(screen.getByPlaceholderText("Ask anything about your product, users, or performance...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Performance digest" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conversation history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
  });

  it("submits with Enter and renders the persisted assistant answer", async () => {
    render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    const composer = await screen.findByLabelText("Message Geo");
    fireEvent.change(composer, { target: { value: "What changed?" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });
    await waitFor(() => expect(aiApi.sendAiMessage).toHaveBeenCalledWith("org_1", "site_1", "aic_1", "What changed?", expect.any(AbortSignal)));
    expect(await screen.findByRole("heading", { name: "Performance" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("table")).toHaveTextContent("Active users"));
    expect(await screen.findByText("Sources and limitations (1)")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics visualizations")).toHaveTextContent("+20% vs previous period");
  });

  it("uses the Geo cube on welcome and changes the compact avatar through the reply", async () => {
    type ChatResponse = Awaited<ReturnType<typeof aiApi.sendAiMessage>>;
    let resolveResponse!: (result: ChatResponse) => void;
    const response = new Promise<ChatResponse>(resolve => { resolveResponse = resolve; });
    vi.mocked(aiApi.sendAiMessage).mockReturnValue(response);

    const { container } = render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    const welcomeAvatar = container.querySelector('.geo-avatar[data-size="hero"][data-state="idle"]');
    expect(welcomeAvatar?.querySelector("svg")).toBeInTheDocument();
    expect(welcomeAvatar).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".geo-welcome-background")).toHaveAttribute("aria-hidden", "true");

    const composer = await screen.findByLabelText("Message Geo");
    fireEvent.change(composer, { target: { value: "What changed?" } });
    fireEvent.keyDown(composer, { key: "Enter" });

    const thinking = await screen.findByText("Analyzing your Movcues data…");
    expect(container.querySelector(".geo-welcome-background")).not.toBeInTheDocument();
    expect(thinking.querySelector('.geo-avatar[data-size="compact"][data-state="thinking"] svg')).toBeInTheDocument();

    resolveResponse({
      userMessage: { ...assistant, id: "aim_1", role: "user", content: "What changed?", evidence: [] },
      assistantMessage: { ...assistant, content: "Here are the results.", contentBlocks: [] },
    });

    await waitFor(() => {
      expect(container.querySelector('.geo-avatar[data-size="compact"][data-state="replying"] svg')).toBeInTheDocument();
    });
    await screen.findByText("Sources and limitations (1)");
    expect(container.querySelector('.geo-avatar[data-state="resting"] svg')).toBeInTheDocument();
    expect(container.querySelector('.geo-avatar[data-state="replying"]')).not.toBeInTheDocument();
  });

  it("renders legacy text-only messages without requiring analytical blocks", async () => {
    vi.mocked(aiApi.sendAiMessage).mockResolvedValue({ userMessage: { ...assistant, id: "aim_1", role: "user", content: "Hello", evidence: [] }, assistantMessage: { ...assistant, contentBlocks: undefined } });
    render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    const composer = await screen.findByLabelText("Message Geo"); fireEvent.change(composer, { target: { value: "Hello" } }); fireEvent.keyDown(composer, { key: "Enter" });
    expect(await screen.findByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(await screen.findByText("Sources and limitations (1)")).toBeInTheDocument();
  });

  it("renders model-ordered text and four charts inline in a single assistant message", async () => {
    const chart = (chartId: string, title: string) => ({ type: "chart" as const, chartId, chart: { type: "area" as const, title, format: "number" as const, series: [{ key: "value", label: "Value" }], data: [] } });
    const inlineAssistant = { ...assistant, content: "Legacy fallback should not lead this message.", contentBlocks: [
      { type: "text" as const, markdown: "## Product activity\n\nHere is the user trend." }, chart("chart-1", "Active users chart"),
      { type: "text" as const, markdown: "Sessions provide the next view." }, chart("chart-2", "Sessions chart"),
      { type: "text" as const, markdown: "Finally, review event activity." }, chart("chart-3", "Event activity chart"),
      { type: "text" as const, markdown: "The breakdown rounds out the evidence." }, chart("chart-4", "Event breakdown chart"),
      { type: "text" as const, markdown: "## Conclusion\n\nContinue investigating." },
    ] };
    vi.mocked(aiApi.sendAiMessage).mockResolvedValue({ userMessage: { ...assistant, id: "aim_1", role: "user", content: "Analyze changes", evidence: [] }, assistantMessage: inlineAssistant });
    render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    const composer = await screen.findByLabelText("Message Geo"); fireEvent.change(composer, { target: { value: "Analyze changes" } }); fireEvent.keyDown(composer, { key: "Enter" });
    const ordered = await screen.findByTestId("ordered-ai-content");
    expect(screen.getAllByTestId("chart-skeleton-area")).toHaveLength(4);
    await screen.findByText("Active users chart");
    const text = ordered.textContent ?? "";
    expect(text.indexOf("Here is the user trend.")).toBeLessThan(text.indexOf("Active users chart"));
    expect(text.indexOf("Active users chart")).toBeLessThan(text.indexOf("Sessions provide the next view."));
    expect(text.indexOf("Sessions provide the next view.")).toBeLessThan(text.indexOf("Sessions chart"));
    expect(text.indexOf("Sessions chart")).toBeLessThan(text.indexOf("Finally, review event activity."));
    expect(text.indexOf("Event activity chart")).toBeLessThan(text.indexOf("Continue investigating."));
    expect(text.indexOf("Event activity chart")).toBeLessThan(text.indexOf("The breakdown rounds out the evidence."));
    expect(text.indexOf("Event breakdown chart")).toBeLessThan(text.indexOf("Continue investigating."));
  });
});

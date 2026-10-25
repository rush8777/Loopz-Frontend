import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovcuesAiPage } from "./MovcuesAiPage";
import * as auth from "@/auth/AuthContext";
import * as workspace from "@/auth/WorkspaceContext";
import * as aiApi from "@/api/ai";

vi.mock("@/auth/AuthContext");
vi.mock("@/auth/WorkspaceContext");
vi.mock("@/api/ai");

const conversation = { id: "aic_1", orgId: "org_1", siteId: "site_1", userId: "usr_1", title: "New conversation", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const assistant = { id: "aim_2", role: "assistant" as const, content: "## Performance\n\nNo activity yet.", evidence: [{ source: "analytics.query", label: "Product metrics" }], proposal: null, approval: null, createdAt: new Date().toISOString() };

describe("Movcues AI page", () => {
  beforeEach(() => {
    vi.mocked(auth.useAuth).mockReturnValue({ user: { id: "usr_1", name: "Sam Lee", email: "sam@example.com" } } as never);
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1", name: "Org", role: "OWNER" }, currentSite: { id: "site_1", siteId: "public_1", name: "Site", domain: null }, loading: false } as never);
    vi.mocked(aiApi.getAiStatus).mockResolvedValue({ enabled: true, provider: "vertex", model: "gemini-test" });
    vi.mocked(aiApi.listAiConversations).mockResolvedValue({ conversations: [] });
    vi.mocked(aiApi.createAiConversation).mockResolvedValue(conversation);
    vi.mocked(aiApi.sendAiMessage).mockResolvedValue({ userMessage: { ...assistant, id: "aim_1", role: "user", content: "What changed?", evidence: [] }, assistantMessage: assistant });
  });

  it("shows the native welcome workspace and authenticated first name", async () => {
    render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Welcome back, Sam" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything about your product, users, or performance...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Performance digest" })).toBeInTheDocument();
  });

  it("submits with Enter and renders the persisted assistant answer", async () => {
    render(<MemoryRouter><MovcuesAiPage /></MemoryRouter>);
    const composer = await screen.findByLabelText("Message Movcues AI");
    fireEvent.change(composer, { target: { value: "What changed?" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });
    await waitFor(() => expect(aiApi.sendAiMessage).toHaveBeenCalledWith("org_1", "site_1", "aic_1", "What changed?", expect.any(AbortSignal)));
    expect(await screen.findByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(screen.getByText("Sources and limitations (1)")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useWorkspace } from "@/auth/WorkspaceContext";
import { knowledgeApi } from "@/api/knowledge";
import { KnowledgePage } from "./KnowledgePage";

vi.mock("@/auth/WorkspaceContext");
vi.mock("@/api/knowledge");
const api = {
  list: vi.fn(), create: vi.fn(), retrieve: vi.fn(),
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useWorkspace).mockReturnValue({ currentOrg: { orgId: "org", role: "ADMIN" }, currentSite: { id: "site" } } as never);
  vi.mocked(knowledgeApi).mockReturnValue(api as never);
  api.list.mockResolvedValue([]);
});

it("creates a private manual source and shows the returned status", async () => {
  api.create.mockImplementation(async () => {
    api.list.mockResolvedValue([{ id: "source", name: "Invoice Help", type: "manual", visibility: "private", enabled: true, status: "queued", documentCount: 0, job: { id: "job", status: "queued" } }]);
  });
  render(<KnowledgePage />);
  fireEvent.click(screen.getByRole("button", { name: "Add source" }));
  fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "manual" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Invoice Help" } });
  fireEvent.change(screen.getByLabelText("Article title"), { target: { value: "Create an invoice" } });
  fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Open Billing and choose New invoice." } });
  fireEvent.click(screen.getByRole("dialog").querySelector('button[type="submit"]')!);
  await waitFor(() => expect(api.create).toHaveBeenCalledWith({
    name: "Invoice Help", type: "manual", visibility: "private", syncHours: null,
    config: { title: "Create an invoice", content: "Open Billing and choose New invoice.", url: undefined },
  }));
  expect(await screen.findByText("Queued")).toBeInTheDocument();
});

it("searches the current site and renders matching excerpts as plain text", async () => {
  api.retrieve.mockResolvedValue([{ chunkId: "chunk", title: "Invoices", heading: "Billing", content: "<script>Open Billing</script>", url: "https://docs.example.com/invoices" }]);
  render(<KnowledgePage />);
  fireEvent.change(screen.getByLabelText("Question"), { target: { value: "How do I open Billing?" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByText("<script>Open Billing</script>")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute("href", "https://docs.example.com/invoices");
  expect(knowledgeApi).toHaveBeenCalledWith("org", "site");
});

it("does not load sources for viewers", () => {
  vi.mocked(useWorkspace).mockReturnValue({ currentOrg: { orgId: "org", role: "VIEWER" }, currentSite: { id: "site" } } as never);
  render(<KnowledgePage />);
  expect(screen.getByText("Administrator access required")).toBeInTheDocument();
  expect(knowledgeApi).not.toHaveBeenCalled();
});

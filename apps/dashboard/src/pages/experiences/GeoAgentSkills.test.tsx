import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { GeoAgentSkills, SkillPreviewDiagnostics } from "./GeoAgentSkills";

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/api/agentSkills", async importOriginal => ({
  ...await importOriginal<typeof import("@/api/agentSkills")>(),
  agentSkills: () => ({ list }),
}));

beforeEach(() => list.mockReset());

it("loads and searches the site registry, exposes readiness, and selects explicitly", async () => {
  list.mockResolvedValue({ skills: [
    { id: "invoice", guideId: "g1", enabled: true, status: "ready", metadata: { name: "Create invoice", description: "Invoice", keywords: ["billing"] } },
    { id: "team", guideId: "g2", enabled: true, status: "failed", metadata: { name: "Invite teammate", description: "Invite a user", keywords: [] } },
  ] });
  const select = vi.fn();
  render(<MemoryRouter><GeoAgentSkills editable orgId="org" siteId="site" selected={[]} onChange={select} /></MemoryRouter>);
  const invoice = await screen.findByRole("checkbox", { name: /Create invoice Ready/ });
  expect(invoice).not.toBeChecked();
  expect(screen.getByText("Indexing failed")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Edit guide for Create invoice" })).toHaveAttribute("href", "/experiences/g1/edit");
  fireEvent.change(screen.getByLabelText("Search skills"), { target: { value: "billing" } });
  expect(screen.queryByText("Invite teammate")).not.toBeInTheDocument();
  fireEvent.click(invoice);
  expect(select).toHaveBeenCalledWith(["invoice"]);
});

it("displays the admin recommendation, evidence, and safe exclusion diagnostics", async () => {
  render(<SkillPreviewDiagnostics result={{
    message: "Create a customer invoice.", citations: [], permitted: true, retrievalMs: 13,
    decision: { decision: "recommend_skill", skillId: "invoice", reason: "Matches approved metadata." },
    candidates: [
      { id: "invoice", name: "Create invoice", score: 0.95, eligible: true },
      { id: "edit", name: "Edit invoice", score: 0.62, eligible: false, reason: "audience_restricted" },
    ],
    documentation: [{ title: "Invoice help", url: null, excerpt: "Open Billing.", score: 0.1 }],
  }} />);
  fireEvent.click(screen.getByText("Retrieval diagnostics"));
  expect(await screen.findByText("Recommend Create invoice")).toBeInTheDocument();
  expect(screen.getByText(/Excluded · Outside the guide audience/)).toBeInTheDocument();
  expect(screen.getByText("Retrieval 13 ms")).toBeInTheDocument();
  expect(screen.getByText("Open Billing.")).toBeInTheDocument();
});

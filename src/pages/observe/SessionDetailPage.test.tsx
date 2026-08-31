import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionDetailPage } from "./SessionDetailPage";
import * as sessionsApi from "../../api/sessions";
import * as workspace from "../../auth/WorkspaceContext";
import type { SessionActivity } from "../../types/api";

vi.mock("../../api/sessions");
vi.mock("../../auth/WorkspaceContext");

const mockedApi = vi.mocked(sessionsApi);
const mockedWorkspace = vi.mocked(workspace);

const activity: SessionActivity = {
  sessionId: "sess_1",
  hasReplay: false,
  visitor: { type: "anonymous", id: "anon_1", label: "anon_1" },
  firstObserved: "2026-08-30T10:00:00.000Z",
  lastObserved: "2026-08-30T10:01:00.000Z",
  observedDurationMs: 60_000,
  counts: { pageVisits: 2, clicks: 1, customEvents: 1 },
  environment: null,
  coverage: { complete: true, rawEventCount: 200, cursorSampleCount: 190 },
  limitations: { observedDuration: "Observed duration note.", hover: "Hover note.", pointer: "Pointer note." },
  pages: [{
    id: "page:pv_1",
    pageViewId: "pv_1",
    path: "/pricing",
    pageName: "Pricing",
    attribution: "recorded",
    firstObserved: "2026-08-30T10:00:00.000Z",
    lastObserved: "2026-08-30T10:01:00.000Z",
    deepestScrollPercent: 78,
    scrollSampleCount: 2,
    pointerSignalsAvailable: 1,
    geometryEvidenceUsable: true,
    items: [
      { id: "click:1", kind: "click", timestamp: "2026-08-30T10:00:05.000Z", element: { label: "Start trial", selector: "#cta" } },
      { id: "custom:2", kind: "custom", timestamp: "2026-08-30T10:00:10.000Z", name: "checkout_started", properties: { plan: "pro" } },
      { id: "hover:3", kind: "long_hover", signalKind: "hover_intent", timestamp: "2026-08-30T10:00:40.000Z", durationMs: 23_000, element: { label: "Plan comparison" } },
      { id: "derived:4", kind: "derived_signal", signalKind: "hesitation", timestamp: "2026-08-30T10:00:45.000Z", evidence: { provenance: "best_effort_time_window", sampleCount: 8 } },
    ],
  }],
};

function renderPage() {
  return render(<MemoryRouter initialEntries={["/observe/sessions/sess_1"]}><Routes><Route path="/observe/sessions/:sessionId" element={<SessionDetailPage />} /></Routes></MemoryRouter>);
}

describe("SessionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWorkspace.useWorkspace.mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as any);
    mockedApi.getSessionActivity.mockResolvedValue(activity);
  });

  it("renders page evidence, distinct application events, scroll depth and long hover", async () => {
    renderPage();
    expect(await screen.findByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Deepest recorded scroll: 78%", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("checkout_started")).toBeInTheDocument();
    expect(screen.getByText("Long hover on Plan comparison — 23s")).toBeInTheDocument();
    expect(screen.queryByText("Back-and-forth pointer movement near an interaction position")).not.toBeInTheDocument();
  });

  it("keeps derived signals off by default and collapsed after enabling", async () => {
    renderPage();
    await screen.findByText("Pricing");
    fireEvent.click(screen.getByLabelText("Derived signals"));
    const section = screen.getByText("Derived pointer signals (1)");
    expect(section).toBeInTheDocument();
    expect(section.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(section);
    expect(section.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("Back-and-forth pointer movement near an interaction position")).toBeInTheDocument();
  });
});

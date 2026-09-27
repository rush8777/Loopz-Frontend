import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Experience, ExperienceDefinition } from "../../../types/experiences";
import { ReviewPublishDialog } from "./ReviewPublishDialog";

const page = { id: "page_1", siteId: "site_1", name: "Pricing", description: null, area: null, pageType: "pricing" as const, rules: [{ id: "rule_1", kind: "include" as const, operator: "starts_with" as const, value: "/pricing" }], heatmapEnabled: false, views: 0, uniqueVisitors: 0, uniqueSessions: 0, lastSeenAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const definition: ExperienceDefinition = { content: { heading: "Welcome", body: "Hello" }, design: { width: "md", theme: { background: "#fff", foreground: "#111", primary: "#2563eb", borderRadius: "md" } }, behavior: { dismissible: true, modalLayout: "center" }, targeting: { pageRules: page.rules, audience: { type: "all" }, trigger: { type: "page_load" }, frequency: { mode: "once" }, priority: 0 } };
const experience: Experience = { id: "exp_1", siteId: "site_1", kind: "widget", widgetType: "modal", name: "Welcome", status: "draft", buildPageId: null, buildUrl: "https://app.test", publishedVersionId: null, launchSetupCompletedAt: null, createdBy: "user_1", createdAt: "2026-01-01", updatedAt: "2026-01-01", draftVersion: null, publishedVersion: null };
const references = { pages: [page], segments: [], events: [], guides: [] };

function renderDialog(overrides: Partial<React.ComponentProps<typeof ReviewPublishDialog>> = {}) {
  const props: React.ComponentProps<typeof ReviewPublishDialog> = { open: true, experience, definition, references, onOpenChange: vi.fn(), onChange: vi.fn(), onCompleteSetup: vi.fn().mockResolvedValue(undefined), onPublish: vi.fn().mockResolvedValue({ ...experience, status: "published" }), onEditExternal: vi.fn(), ...overrides };
  return { props, ...render(<ReviewPublishDialog {...props} />) };
}

describe("ReviewPublishDialog", () => {
  it("opens first-time launch setup without publishing and advances the progress", () => {
    const { props } = renderDialog();
    expect(screen.getByRole("heading", { name: "Who should see this experience?" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(props.onPublish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Where should this experience appear?" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("persists setup completion before entering Review", async () => {
    const { props } = renderDialog();
    for (let index = 0; index < 5; index += 1) fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Review and publish" });
    expect(props.onCompleteSetup).toHaveBeenCalledTimes(1);
    expect(props.onPublish).not.toHaveBeenCalled();
  });

  it("opens directly on Review after setup and can return to edit a section", () => {
    renderDialog({ experience: { ...experience, launchSetupCompletedAt: "2026-01-02" } });
    expect(screen.getByRole("heading", { name: "Review and publish" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("heading", { name: "Who should see this experience?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to review" }));
    expect(screen.getByRole("heading", { name: "Review and publish" })).toBeInTheDocument();
  });

  it("requires broad-target acknowledgement before Publish now", () => {
    renderDialog({ experience: { ...experience, launchSetupCompletedAt: "2026-01-02" }, definition: { ...definition, targeting: { ...definition.targeting, pageRules: [] } } });
    expect(screen.getByRole("button", { name: "Publish now" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I intend to show/i }));
    expect(screen.getByRole("button", { name: "Publish now" })).toBeEnabled();
  });

  it("publishes only from the final action and surfaces backend errors", async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error("A referenced Segment no longer exists."));
    renderDialog({ experience: { ...experience, launchSetupCompletedAt: "2026-01-02" }, onPublish });
    fireEvent.click(screen.getByRole("button", { name: "Publish now" }));
    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("A referenced Segment no longer exists.")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagesPage } from "./PagesPage";
import * as pagesApi from "../../api/pages";
import * as workspace from "../../auth/WorkspaceContext";

vi.mock("../../api/pages");
vi.mock("../../auth/WorkspaceContext");

describe("PagesPage MVP1 copy", () => {
  beforeEach(() => {
    vi.mocked(workspace.useWorkspace).mockReturnValue({ currentOrg: { orgId: "org_1" }, currentSite: { id: "site_1" } } as never);
    vi.mocked(pagesApi.listPages).mockResolvedValue({ pages: [] });
    vi.mocked(pagesApi.listUntaggedUrls).mockResolvedValue({ untagged: [] });
  });

  it("describes current Page functionality without promising Heatmaps or Replay", async () => {
    render(<MemoryRouter><PagesPage /></MemoryRouter>);
    expect(screen.getByText("Group the URLs your app generates into logical Pages for analytics, targeting, funnels, segments, and in-app experiences.")).toBeInTheDocument();
    expect(screen.queryByText(/heatmaps and replay/i)).not.toBeInTheDocument();
    expect(await screen.findByText("No pages tagged yet")).toBeInTheDocument();
  });
});

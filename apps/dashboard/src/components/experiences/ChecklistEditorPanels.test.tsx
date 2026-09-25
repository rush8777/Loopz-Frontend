import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChecklistExperienceDefinition } from "../../types/experiences";
import {
  ChecklistInspector,
  ChecklistStructurePanel,
  type ChecklistSelection,
} from "./ChecklistEditorPanels";

function definition(): ChecklistExperienceDefinition {
  return {
    title: "Getting started",
    description: "Complete these steps.",
    items: [
      {
        id: "stable-task-id",
        title: "Create a project",
        description: "Make your first project.",
        action: { type: "none" },
        completion: { type: "item_clicked" },
      },
    ],
    behavior: {
      position: "bottom-right",
      order: "any",
      dismissible: true,
      initialState: "expanded",
      showRemainingCount: true,
    },
    completionMessage: {
      title: "All done",
      description: "You're ready.",
      acknowledgeLabel: "Continue",
    },
    targeting: { pageRules: [], audience: { type: "all" }, priority: 0 },
    builder: {
      version: 1,
      projectData: {},
      html: '<section data-movecues-checklist-role="root"></section>',
      css: ".movecues-widget{color:#111}",
    },
  };
}

describe("Checklist editor panels", () => {
  it("keeps the left rail structural and creates a stable task before selecting it", () => {
    const onSelect = vi.fn();
    const onItemsChange = vi.fn();
    render(
      <ChecklistStructurePanel
        definition={definition()}
        selection={{ type: "root" }}
        onSelect={onSelect}
        onItemsChange={onItemsChange}
      />,
    );

    expect(
      screen.getByRole("complementary", { name: "Checklist structure" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Create a project")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add task/i }));
    const nextItems = onItemsChange.mock.calls[0][0];
    expect(nextItems).toHaveLength(2);
    expect(nextItems[1].id).toMatch(/^item_/);
    expect(onSelect).toHaveBeenLastCalledWith({
      type: "task",
      itemId: nextItems[1].id,
    });
  });

  it("edits task logic contextually without regenerating its item id", () => {
    function Harness() {
      const [value, setValue] = useState(definition());
      const selection: ChecklistSelection = {
        type: "task",
        itemId: "stable-task-id",
      };
      return (
        <ChecklistInspector
          definition={value}
          selection={selection}
          guides={[]}
          segments={[]}
          pages={[]}
          orgId="org"
          siteId="site"
          experienceId="checklist"
          onChange={(update) =>
            setValue((current) => {
              const next = structuredClone(current);
              update(next);
              return next;
            })
          }
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Task" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Destination")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Invite a teammate" },
    });
    fireEvent.change(screen.getByLabelText("On click"), {
      target: { value: "navigate" },
    });
    fireEvent.change(screen.getByLabelText("Destination"), {
      target: { value: "/team" },
    });

    expect(screen.getByLabelText("Title")).toHaveValue("Invite a teammate");
    expect(screen.getByLabelText("Destination")).toHaveValue("/team");
    expect(screen.getByLabelText("Complete when")).not.toBeDisabled();
  });
});

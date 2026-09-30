import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { ExperienceTargeting } from "../../types/experiences";
import { AdvancedFrequencyControls } from "./AdvancedFrequencyControls";

type Frequency = ExperienceTargeting["frequency"];

function FrequencyHarness({ initial }: { initial: Frequency }) {
  const [frequency, setFrequency] = useState(initial);
  return <><AdvancedFrequencyControls frequency={frequency} onChange={setFrequency} /><output data-testid="frequency">{JSON.stringify(frequency)}</output></>;
}

function savedFrequency(): Frequency {
  return JSON.parse(screen.getByTestId("frequency").textContent ?? "{}") as Frequency;
}

describe("AdvancedFrequencyControls", () => {
  it.each(["once", "once_per_session", "every_time"] as const)("saves a cooldown without changing the %s frequency mode", (mode) => {
    render(<FrequencyHarness initial={{ mode }} />);
    fireEvent.change(screen.getByLabelText("Wait before showing again"), { target: { value: "6" } });
    expect(savedFrequency()).toEqual({ mode, cooldownHours: 6 });
  });

  it("converts days to cooldown hours", () => {
    render(<FrequencyHarness initial={{ mode: "every_time" }} />);
    fireEvent.change(screen.getByLabelText("Wait before showing again unit"), { target: { value: "days" } });
    fireEvent.change(screen.getByLabelText("Wait before showing again"), { target: { value: "3" } });
    expect(savedFrequency()).toEqual({ mode: "every_time", cooldownHours: 72 });
  });

  it("saves maximum impressions and removes either setting when cleared", () => {
    render(<FrequencyHarness initial={{ mode: "every_time", cooldownHours: 12, maxImpressions: 5 }} />);
    fireEvent.change(screen.getByLabelText("Maximum times per user"), { target: { value: "9" } });
    expect(savedFrequency()).toEqual({ mode: "every_time", cooldownHours: 12, maxImpressions: 9 });
    fireEvent.change(screen.getByLabelText("Wait before showing again"), { target: { value: "" } });
    expect(savedFrequency()).toEqual({ mode: "every_time", maxImpressions: 9 });
    fireEvent.change(screen.getByLabelText("Maximum times per user"), { target: { value: "" } });
    expect(savedFrequency()).toEqual({ mode: "every_time" });
  });

  it("restores saved values when reopened", () => {
    render(<FrequencyHarness initial={{ mode: "every_time", cooldownHours: 48, maxImpressions: 4 }} />);
    expect(screen.getByLabelText("Wait before showing again")).toHaveValue(2);
    expect(screen.getByLabelText("Wait before showing again unit")).toHaveValue("days");
    expect(screen.getByLabelText("Maximum times per user")).toHaveValue(4);
  });
});

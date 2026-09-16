// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OptionPicker, type PickerOption } from "./option-picker";

afterEach(cleanup);

const options: PickerOption[] = [
  { value: "fighter", label: "Fighter", keywords: "martial weapons", preview: "Weapon master.", badges: ["BAB full"] },
  { value: "wizard", label: "Wizard", keywords: "arcane caster", preview: "Arcane scholar." },
  { value: "rogue", label: "Rogue", keywords: "skills sneak", preview: "Skill monkey." },
];

describe("OptionPicker", () => {
  it("renders every option with its preview", () => {
    render(<OptionPicker options={options} value={null} onChange={() => {}} />);
    expect(screen.getByText("Fighter")).toBeTruthy();
    expect(screen.getByText("Weapon master.")).toBeTruthy();
    expect(screen.getByText("Arcane scholar.")).toBeTruthy();
  });

  it("marks the selected option", () => {
    render(<OptionPicker options={options} value="wizard" onChange={() => {}} />);
    const selected = screen.getByRole("radio", { name: /wizard/i });
    expect(selected.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange with the clicked option value", () => {
    const onChange = vi.fn();
    render(<OptionPicker options={options} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /rogue/i }));
    expect(onChange).toHaveBeenCalledWith("rogue");
  });

  it("filters by label and keywords when searched", () => {
    render(
      <OptionPicker
        options={options}
        value={null}
        onChange={() => {}}
        searchable
      />,
    );
    const search = screen.getByRole("textbox");
    fireEvent.change(search, { target: { value: "arcane" } });
    expect(screen.queryByText("Fighter")).toBeNull();
    expect(screen.getByText("Wizard")).toBeTruthy();
  });

  it("groups options when groupBy is provided", () => {
    render(
      <OptionPicker
        options={options}
        value={null}
        onChange={() => {}}
        groupBy={(o) => (o.value === "wizard" ? "Casters" : "Martial")}
      />,
    );
    expect(screen.getByText("Casters")).toBeTruthy();
    expect(screen.getByText("Martial")).toBeTruthy();
  });
});

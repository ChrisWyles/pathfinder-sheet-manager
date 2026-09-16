// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WizardFooter } from "./wizard-footer";
import { WizardProvider } from "./wizard-provider";

vi.mock("@/app/(app)/characters/actions", () => ({
  createCharacter: vi.fn().mockResolvedValue({}),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/characters/new/class"),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

const emptyData = {
  classes: [],
  skills: [],
  feats: [],
  spheres: [],
  talents: [],
  items: [],
  castingDrawbacks: [],
  castingBoons: [],
  martialDrawbacks: [],
};

function renderAt(path: string) {
  vi.mocked(usePathname).mockReturnValue(path);
  vi.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
  return render(
    <WizardProvider {...emptyData}>
      <WizardFooter />
    </WizardProvider>,
  );
}

describe("WizardFooter", () => {
  it("Back is disabled on the first step", () => {
    renderAt("/characters/new/system");
    expect(
      screen.getByRole("button", { name: /back/i }),
    ).toHaveProperty("disabled", true);
  });

  it("Next pushes to the following enabled step", () => {
    renderAt("/characters/new/class");
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(push).toHaveBeenCalledWith("/characters/new/abilities");
  });

  it("Back pushes to the previous enabled step", () => {
    renderAt("/characters/new/race");
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(push).toHaveBeenCalledWith("/characters/new/system");
  });

  it("shows Create character instead of Next on the last step", () => {
    renderAt("/characters/new/review");
    expect(
      screen.getByRole("button", { name: /create character/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^next$/i })).toBeNull();
  });
});

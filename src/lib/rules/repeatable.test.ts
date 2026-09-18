import { describe, expect, it } from "vitest";

import { parseRepeatable } from "./repeatable";

describe("parseRepeatable", () => {
  it("reads an explicit numeric cap from 'up to N times'", () => {
    expect(
      parseRepeatable(
        "You gain proficiency with light armor and medium armor. You may take this talent up to two times.",
        "talent",
      ),
    ).toEqual({ repeatable: true, maxTakes: 2 });
    expect(
      parseRepeatable("You may take this talent up to 4 times, its effects stack.", "talent"),
    ).toEqual({ repeatable: true, maxTakes: 4 });
  });

  it("reads 'twice' / 'a second time' as a cap of 2", () => {
    expect(
      parseRepeatable("You may take this talent twice; the effects stack.", "talent"),
    ).toEqual({ repeatable: true, maxTakes: 2 });
    expect(
      parseRepeatable("You may take this talent a second time.", "talent"),
    ).toEqual({ repeatable: true, maxTakes: 2 });
  });

  it("reads 'a total of N times' as that cap", () => {
    expect(
      parseRepeatable("You may take this talent a total of two times.", "talent"),
    ).toEqual({ repeatable: true, maxTakes: 2 });
  });

  it("treats 'multiple times'/'more than once' as uncapped", () => {
    expect(
      parseRepeatable(
        "You may take this feat multiple times. The effects stack.",
        "feat",
      ),
    ).toEqual({ repeatable: true, maxTakes: null });
    expect(
      parseRepeatable("You may take this talent more than once; the effects stack.", "talent"),
    ).toEqual({ repeatable: true, maxTakes: null });
  });

  it("is not repeatable when there's no 'take this <noun>' language", () => {
    expect(
      parseRepeatable(
        "This talent can be taken as a utility talent by having its benefits not apply to Intimidate checks.",
        "talent",
      ),
    ).toEqual({ repeatable: false, maxTakes: null });
    expect(
      parseRepeatable("You gain a +1 competence bonus to your caster level.", "feat"),
    ).toEqual({ repeatable: false, maxTakes: null });
  });

  it("doesn't cross-match feat text against the talent noun or vice versa", () => {
    expect(
      parseRepeatable("You may take this feat multiple times.", "talent"),
    ).toEqual({ repeatable: false, maxTakes: null });
  });
});

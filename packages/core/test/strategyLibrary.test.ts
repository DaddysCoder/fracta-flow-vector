import { describe, expect, it } from "vitest";
import { isPinOutdated, pinStrategy, type StrategyLibraryEntry } from "../src/strategyLibrary.js";

const ENTRY: StrategyLibraryEntry = {
  id: "lib-visual-schedule",
  version: "3",
  title: "Visual schedule",
};

describe("pinStrategy", () => {
  it("records the library entry's id and version at the moment of creation", () => {
    const pin = pinStrategy(ENTRY, "2026-08-18T00:00:00.000Z");
    expect(pin).toEqual({
      libraryId: "lib-visual-schedule",
      libraryVersion: "3",
      pinnedAt: "2026-08-18T00:00:00.000Z",
    });
  });

  it("keeps its pinned version after the library entry moves on", () => {
    const pin = pinStrategy(ENTRY, "2026-08-18T00:00:00.000Z");

    // The library publishes a new version of the same entry.
    const updated: StrategyLibraryEntry = { ...ENTRY, version: "4", title: "Visual schedule (rev)" };

    // The already-created instance is untouched — this is the whole point.
    expect(pin.libraryVersion).toBe("3");
    expect(isPinOutdated(pin, updated)).toBe(true);
  });

  it("does not report a pin as outdated while the library version matches", () => {
    const pin = pinStrategy(ENTRY, "2026-08-18T00:00:00.000Z");
    expect(isPinOutdated(pin, ENTRY)).toBe(false);
  });

  it("does not compare pins across different library entries", () => {
    const pin = pinStrategy(ENTRY, "2026-08-18T00:00:00.000Z");
    const other: StrategyLibraryEntry = { id: "lib-other", version: "9", title: "Something else" };
    expect(isPinOutdated(pin, other)).toBe(false);
  });

  it("freezes the pin so nothing downstream can quietly re-point it", () => {
    const pin = pinStrategy(ENTRY, "2026-08-18T00:00:00.000Z");
    expect(() => {
      (pin as { libraryVersion: string }).libraryVersion = "4";
    }).toThrow();
    expect(pin.libraryVersion).toBe("3");
  });
});

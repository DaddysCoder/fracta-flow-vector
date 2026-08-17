import { describe, expect, it } from "vitest";
import { resolvePathway } from "../src/pathway.js";
import { toPathwayPermissions } from "./fixtures.js";

describe("resolvePathway — none", () => {
  it("resolves to no_rp regardless of approved gates", () => {
    const resolved = resolvePathway("none", toPathwayPermissions("none"), new Set());
    expect(resolved.pathway).toBe("no_rp");
  });

  it("stays no_rp even if fba.approved is set", () => {
    const resolved = resolvePathway("none", toPathwayPermissions("none"), new Set(["fba.approved"]));
    expect(resolved.pathway).toBe("no_rp");
  });

  it("carries the registry's permits/forbids for this classification", () => {
    const resolved = resolvePathway("none", toPathwayPermissions("none"), new Set());
    expect(resolved.permits).toContain("07");
    expect(resolved.forbids).toEqual(["08", "09"]);
    expect(resolved.blocks).toEqual([]);
  });
});

describe("resolvePathway — possible_unclear", () => {
  it("resolves to interim, not no_rp — treated as in-RP pending investigation", () => {
    const resolved = resolvePathway("possible_unclear", toPathwayPermissions("possible_unclear"), new Set());
    expect(resolved.pathway).toBe("interim");
  });

  it("stays interim even if fba.approved is set", () => {
    const resolved = resolvePathway(
      "possible_unclear",
      toPathwayPermissions("possible_unclear"),
      new Set(["fba.approved"]),
    );
    expect(resolved.pathway).toBe("interim");
  });

  it("blocks Strategy Instance authoring (06) and the no-RP BSP (07) pending resolution", () => {
    const resolved = resolvePathway("possible_unclear", toPathwayPermissions("possible_unclear"), new Set());
    expect(resolved.blocks).toEqual(expect.arrayContaining(["06", "07"]));
  });

  it("forbids the Interim BSP release (08) until classification resolves", () => {
    const resolved = resolvePathway("possible_unclear", toPathwayPermissions("possible_unclear"), new Set());
    expect(resolved.forbids).toContain("08");
  });
});

describe("resolvePathway — confirmed", () => {
  it("resolves to interim before the FBA conclusion is approved", () => {
    const resolved = resolvePathway("confirmed", toPathwayPermissions("confirmed"), new Set());
    expect(resolved.pathway).toBe("interim");
  });

  it("resolves to comprehensive once fba.approved is set", () => {
    const resolved = resolvePathway("confirmed", toPathwayPermissions("confirmed"), new Set(["fba.approved"]));
    expect(resolved.pathway).toBe("comprehensive");
  });

  it("permits both the Interim (08) and Comprehensive (09) BSP, forbids the no-RP BSP (07)", () => {
    const resolved = resolvePathway("confirmed", toPathwayPermissions("confirmed"), new Set());
    expect(resolved.permits).toEqual(expect.arrayContaining(["08", "09"]));
    expect(resolved.forbids).toContain("07");
  });
});

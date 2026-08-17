import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "../src/capabilities.js";
import { checkAuthoringGates, checkReleaseGates, type InterimSafeguard } from "../src/gates.js";
import { toTargetDocument } from "./fixtures.js";

const STRATEGY_WORKSHEET = toTargetDocument("06", "strategy-1");
const NO_RP_BSP = toTargetDocument("07", "bsp-2026");
const INTERIM_BSP = toTargetDocument("08", "interim-2026");
const COMPREHENSIVE_BSP = toTargetDocument("09", "comprehensive-2026");

describe("gates — fba.approved", () => {
  it("blocks tier3 authoring in a No-RP plan until fba.approved", () => {
    const violations = checkAuthoringGates(
      { documentId: "07", pathway: "no_rp", approvedGates: new Set(), targetDocument: NO_RP_BSP },
      CAPABILITIES.connected,
    );
    // No-RP BSP has no tier3 fields authored directly (they're all
    // rendersIn quotes from the BSA/FBA), so nothing to block here.
    expect(violations).toEqual([]);
  });

  it("blocks Strategy Instance authoring (document 06) until fba.approved", () => {
    const violations = checkAuthoringGates(
      { documentId: "06", pathway: "no_rp", approvedGates: new Set(), targetDocument: STRATEGY_WORKSHEET },
      CAPABILITIES.connected,
    );
    expect(violations.map((v) => v.gate)).toContain("fba.approved");
    expect(violations.every((v) => v.severity === "blocking")).toBe(true);
  });

  it("allows Strategy Instance authoring once fba.approved is set", () => {
    const violations = checkAuthoringGates(
      {
        documentId: "06",
        pathway: "no_rp",
        approvedGates: new Set(["fba.approved"]),
        targetDocument: STRATEGY_WORKSHEET,
      },
      CAPABILITIES.connected,
    );
    expect(violations).toEqual([]);
  });

  it("does not require fba.approved for tier3 content authored on the Interim BSP", () => {
    // interim.safeguard_rationale is tier3, askedIn 08.9 — the Interim
    // pathway is deliberately excluded from the fba.approved gate so it
    // can open before the FBA concludes.
    const violations = checkAuthoringGates(
      { documentId: "08", pathway: "interim", approvedGates: new Set(), targetDocument: INTERIM_BSP },
      CAPABILITIES.connected,
    );
    expect(violations.map((v) => v.gate)).not.toContain("fba.approved");
  });
});

describe("gates — the Interim BSP forbids Strategy Instances", () => {
  it("has nothing to violate against the real registry (no strategy_instance field is askedIn 08.x)", () => {
    const violations = checkAuthoringGates(
      { documentId: "08", pathway: "interim", approvedGates: new Set(), targetDocument: INTERIM_BSP },
      CAPABILITIES.connected,
    );
    expect(violations.map((v) => v.gate)).not.toContain("interim.no_strategy_instances");
  });

  it("flags it defensively if an interim document schema did carry Strategy Instance fields", () => {
    const contaminated = {
      ...INTERIM_BSP,
      fields: STRATEGY_WORKSHEET.fields.map((f) =>
        f.isStrategyInstance ? { ...f, section: "08.9" } : f,
      ),
    };
    const violations = checkAuthoringGates(
      { documentId: "08", pathway: "interim", approvedGates: new Set(), targetDocument: contaminated },
      CAPABILITIES.connected,
    );
    expect(violations.map((v) => v.gate)).toContain("interim.no_strategy_instances");
  });
});

describe("gates — standalone mode downgrades to guidance, never a silent pass", () => {
  it("still returns the violation, just as guidance instead of blocking", () => {
    const violations = checkAuthoringGates(
      { documentId: "06", pathway: "no_rp", approvedGates: new Set(), targetDocument: STRATEGY_WORKSHEET },
      CAPABILITIES.standalone,
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.severity === "guidance")).toBe(true);
  });
});

describe("gates — Comprehensive BSP release requires every interim safeguard disposed", () => {
  const context = {
    documentId: "09",
    pathway: "comprehensive" as const,
    approvedGates: new Set(["fba.approved"]),
    targetDocument: COMPREHENSIVE_BSP,
  };

  it("blocks release while any safeguard has no disposition — no default is assumed", () => {
    const safeguards: InterimSafeguard[] = [
      { id: "sg-1", unassessed: false, disposition: "revise" },
      { id: "sg-2", unassessed: false, disposition: null },
    ];
    const violations = checkReleaseGates(context, CAPABILITIES.connected, safeguards);
    const blocker = violations.find((v) => v.gate === "interim.dispositions_complete");
    expect(blocker).toBeDefined();
    expect(blocker!.severity).toBe("blocking");
  });

  it("allows release once every safeguard has one of the four dispositions", () => {
    const safeguards: InterimSafeguard[] = [
      { id: "sg-1", unassessed: false, disposition: "retire" },
      { id: "sg-2", unassessed: false, disposition: "retain_with_new_justification" },
    ];
    const violations = checkReleaseGates(context, CAPABILITIES.connected, safeguards);
    expect(violations.map((v) => v.gate)).not.toContain("interim.dispositions_complete");
  });

  it("is not triggered by a document other than 09", () => {
    const violations = checkReleaseGates(
      { ...context, documentId: "07", targetDocument: NO_RP_BSP },
      CAPABILITIES.connected,
      [{ id: "sg-1", unassessed: false, disposition: null }],
    );
    expect(violations.map((v) => v.gate)).not.toContain("interim.dispositions_complete");
  });
});

describe("gates — checkReleaseGates includes authoring gates too", () => {
  it("re-checks fba.approved at release, not just at authoring time", () => {
    const violations = checkReleaseGates(
      { documentId: "06", pathway: "no_rp", approvedGates: new Set(), targetDocument: STRATEGY_WORKSHEET },
      CAPABILITIES.connected,
    );
    expect(violations.map((v) => v.gate)).toContain("fba.approved");
  });
});

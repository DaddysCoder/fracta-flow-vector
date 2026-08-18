import { CAPABILITIES, resolvePathway, type SafeguardDisposition } from "@pbs/core";
import { registry } from "@pbs/registry";
import { describe, expect, it } from "vitest";
import { authoringGates, documentGatesFor, releaseGates } from "../src/documentForm.js";
import { documentSteps, planDocumentId, reachableDocumentIds } from "../src/flow.js";
import {
  COMPREHENSIVE_BSP_DOCUMENT_ID,
  INTERIM_BSP_DOCUMENT_ID,
  NO_RP_BSP_DOCUMENT_ID,
  safeguardsFromRows,
  STRATEGY_DOCUMENT_ID,
  undisposedSafeguards,
} from "../src/plan.js";
import { toPathwayPermissions } from "../src/registryAdapter.js";

const NO_GATES: ReadonlySet<string> = new Set();
const FBA_APPROVED: ReadonlySet<string> = new Set(["fba.approved"]);

describe("documentGatesFor reads the registry rather than hardcoding", () => {
  it("gates exactly the documents pathways.json says fba.approved unlocks", () => {
    for (const id of registry.pathways.gates["fba.approved"]!.unlocks!) {
      expect(documentGatesFor(id)).toContain("fba.approved");
    }
  });

  it("does not gate the documents that come before the FBA", () => {
    for (const id of ["01", "02", "03", "04", "05", "08"]) {
      expect(documentGatesFor(id)).toEqual([]);
    }
  });
});

describe("documents 06/07/09 check the fba.approved gate before authoring", () => {
  for (const documentId of [STRATEGY_DOCUMENT_ID, NO_RP_BSP_DOCUMENT_ID, COMPREHENSIVE_BSP_DOCUMENT_ID]) {
    it(`document ${documentId} reports fba.approved as unmet before approval`, () => {
      const violations = authoringGates({
        documentId,
        instanceId: `${documentId}-draft`,
        pathway: documentId === COMPREHENSIVE_BSP_DOCUMENT_ID ? "comprehensive" : "no_rp",
        approvedGates: NO_GATES,
        caps: CAPABILITIES.connected,
      });
      expect(violations.map((v) => v.gate)).toContain("fba.approved");
      expect(violations.some((v) => v.severity === "blocking")).toBe(true);
    });

    it(`document ${documentId} clears once the FBA conclusion is approved`, () => {
      const violations = authoringGates({
        documentId,
        instanceId: `${documentId}-draft`,
        pathway: documentId === COMPREHENSIVE_BSP_DOCUMENT_ID ? "comprehensive" : "no_rp",
        approvedGates: FBA_APPROVED,
        caps: CAPABILITIES.connected,
      });
      expect(violations.map((v) => v.gate)).not.toContain("fba.approved");
    });

    it(`document ${documentId} still surfaces the gate in standalone mode, as guidance`, () => {
      const violations = authoringGates({
        documentId,
        instanceId: `${documentId}-draft`,
        pathway: documentId === COMPREHENSIVE_BSP_DOCUMENT_ID ? "comprehensive" : "no_rp",
        approvedGates: NO_GATES,
        caps: CAPABILITIES.standalone,
      });
      expect(violations.map((v) => v.gate)).toContain("fba.approved");
      expect(violations.every((v) => v.severity === "guidance")).toBe(true);
    });
  }

  it("does not gate the Interim BSP on the FBA — it opens before the assessment concludes", () => {
    const violations = authoringGates({
      documentId: INTERIM_BSP_DOCUMENT_ID,
      instanceId: "interim-draft",
      pathway: "interim",
      approvedGates: NO_GATES,
      caps: CAPABILITIES.connected,
    });
    expect(violations.map((v) => v.gate)).not.toContain("fba.approved");
  });
});

describe("interim safeguards block a comprehensive release until disposed", () => {
  const rows = [
    { rowId: "sg-1", values: { "interim.safeguard_rationale": "Door alarm overnight" } },
    { rowId: "sg-2", values: { "interim.safeguard_rationale": "Two-staff transport" } },
  ];

  it("flags every safeguard unassessed, with no default disposition", () => {
    const safeguards = safeguardsFromRows(rows);
    expect(safeguards.every((s) => s.unassessed)).toBe(true);
    expect(safeguards.every((s) => s.disposition === null)).toBe(true);
    expect(undisposedSafeguards(safeguards)).toHaveLength(2);
  });

  it("blocks document 09's release while any safeguard is undisposed", () => {
    const violations = releaseGates(
      {
        documentId: COMPREHENSIVE_BSP_DOCUMENT_ID,
        instanceId: "comprehensive-draft",
        pathway: "comprehensive",
        approvedGates: FBA_APPROVED,
        caps: CAPABILITIES.connected,
      },
      safeguardsFromRows(rows, { "sg-1": "retire" }),
    );
    expect(violations.map((v) => v.gate)).toContain("interim.dispositions_complete");
    expect(violations.find((v) => v.gate === "interim.dispositions_complete")!.severity).toBe(
      "blocking",
    );
  });

  it("releases once every safeguard carries one of the four dispositions", () => {
    const dispositions: Record<string, SafeguardDisposition> = {
      "sg-1": "retire",
      "sg-2": "retain_with_new_justification",
    };
    const violations = releaseGates(
      {
        documentId: COMPREHENSIVE_BSP_DOCUMENT_ID,
        instanceId: "comprehensive-draft",
        pathway: "comprehensive",
        approvedGates: FBA_APPROVED,
        caps: CAPABILITIES.connected,
      },
      safeguardsFromRows(rows, dispositions),
    );
    expect(violations).toEqual([]);
  });

  it("surfaces the same block as guidance in standalone mode, never dropping it", () => {
    const violations = releaseGates(
      {
        documentId: COMPREHENSIVE_BSP_DOCUMENT_ID,
        instanceId: "comprehensive-draft",
        pathway: "comprehensive",
        approvedGates: FBA_APPROVED,
      },
      safeguardsFromRows(rows),
    );
    expect(violations.map((v) => v.gate)).toContain("interim.dispositions_complete");
    expect(violations.every((v) => v.severity === "guidance")).toBe(true);
  });
});

describe("the flow the practitioner is offered follows the registry", () => {
  function flowFor(classification: "none" | "possible_unclear" | "confirmed", gates = NO_GATES) {
    return resolvePathway(classification, toPathwayPermissions(classification), gates);
  }

  it("no_rp: 01-07 reachable, the No-RP plan is the plan, RRP plans are not offered", () => {
    const resolved = flowFor("none");
    expect(resolved.pathway).toBe("no_rp");
    expect(reachableDocumentIds(resolved)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
    expect(planDocumentId(resolved)).toBe("07");
  });

  it("possible_unclear: assessment continues, plans and strategies are withheld not forbidden", () => {
    const resolved = flowFor("possible_unclear");
    expect(resolved.pathway).toBe("interim");
    expect(reachableDocumentIds(resolved)).toEqual(["01", "02", "03", "04", "05"]);
    const steps = documentSteps(resolved);
    expect(steps.find((s) => s.id === "06")!.reachability).toBe("blocked");
    expect(steps.find((s) => s.id === "07")!.reachability).toBe("blocked");
    expect(steps.find((s) => s.id === "08")!.reachability).toBe("forbidden");
    expect(planDocumentId(resolved)).toBeNull();
  });

  it("confirmed: the interim plan opens immediately, the No-RP plan never does", () => {
    const resolved = flowFor("confirmed");
    expect(reachableDocumentIds(resolved)).toEqual(["01", "02", "03", "04", "05", "06", "08", "09"]);
    expect(planDocumentId(resolved)).toBe("08");
    expect(documentSteps(resolved).find((s) => s.id === "07")!.reachability).toBe("forbidden");
  });

  it("confirmed only reaches the comprehensive pathway once the FBA is approved", () => {
    expect(flowFor("confirmed").pathway).toBe("interim");
    expect(flowFor("confirmed", FBA_APPROVED).pathway).toBe("comprehensive");
  });

  it("names every one of the nine documents in the flow, whatever the classification", () => {
    for (const classification of ["none", "possible_unclear", "confirmed"] as const) {
      expect(documentSteps(flowFor(classification))).toHaveLength(9);
    }
  });
});

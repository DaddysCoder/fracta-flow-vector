import { registry } from "@pbs/registry";
import { describe, expect, it } from "vitest";
import {
  canApproveFba,
  fbaApprovalBlockers,
  fbaGateUnlocks,
  FRAME_RECONCILED_SECTION_IDS,
} from "../src/assessment.js";
import type { FormValues } from "../src/FormRenderer.js";
import {
  acceptFinding,
  buildParticipantContext,
  reconcileBundle,
  RECONCILABLE_FIELD_IDS,
  type FbaOutcomeBundle,
} from "../src/frameContractStub.js";

const EMPTY: FormValues = { scalar: {}, groups: {} };

function bundleWith(findings: FbaOutcomeBundle["findings"]): FbaOutcomeBundle {
  return {
    bundleId: "bundle-1",
    caseRef: "assessment-draft",
    generatedAt: "2026-08-18T00:00:00.000Z",
    findings,
  };
}

describe("what a Frame bundle is allowed to touch", () => {
  it("only targets fields asked in Document 04's reconciled sections", () => {
    for (const fieldId of RECONCILABLE_FIELD_IDS) {
      const def = registry.fields.find((f) => f.id === fieldId);
      expect(def).toBeDefined();
      expect(FRAME_RECONCILED_SECTION_IDS).toContain(def!.askedIn);
    }
  });

  it("never includes a field from another document — no reaching into triage or a plan", () => {
    for (const fieldId of RECONCILABLE_FIELD_IDS) {
      expect(registry.fields.find((f) => f.id === fieldId)!.askedIn.startsWith("04.")).toBe(true);
    }
  });

  it("covers the behaviour and analysis content Frame actually produces", () => {
    expect(RECONCILABLE_FIELD_IDS.has("behaviour.definition")).toBe(true);
    expect(RECONCILABLE_FIELD_IDS.has("analysis.formulation")).toBe(true);
    expect(RECONCILABLE_FIELD_IDS.has("analysis.hypotheses")).toBe(true);
    // The practitioner's own conclusion (04.9) is NOT reconcilable — it is
    // Vector's judgement, not Frame's output.
    expect(RECONCILABLE_FIELD_IDS.has("analysis.conclusion")).toBe(false);
    expect(RECONCILABLE_FIELD_IDS.has("goals")).toBe(false);
  });
});

describe("reconcileBundle", () => {
  it("reports a finding as offered while nothing is recorded locally", () => {
    const items = reconcileBundle(
      bundleWith([{ id: "f1", targetFieldId: "analysis.formulation", value: "Escape-maintained" }]),
      EMPTY,
    );
    expect(items[0]?.status).toBe("offered");
  });

  it("never writes anything itself — the values it was given come back untouched", () => {
    const values: FormValues = { scalar: {}, groups: {} };
    reconcileBundle(
      bundleWith([{ id: "f1", targetFieldId: "analysis.formulation", value: "Escape-maintained" }]),
      values,
    );
    expect(values).toEqual({ scalar: {}, groups: {} });
  });

  it("reports a recorded value that matches as accepted, and one that differs as differing", () => {
    const values: FormValues = { scalar: { "analysis.formulation": "Escape-maintained" }, groups: {} };
    const [same] = reconcileBundle(
      bundleWith([{ id: "f1", targetFieldId: "analysis.formulation", value: "Escape-maintained" }]),
      values,
    );
    expect(same?.status).toBe("accepted_unchanged");

    const [different] = reconcileBundle(
      bundleWith([{ id: "f1", targetFieldId: "analysis.formulation", value: "Sensory" }]),
      values,
    );
    expect(different?.status).toBe("differs");
    expect(different?.localValue).toBe("Escape-maintained");
  });

  it("rejects a finding aimed at a field outside Document 04's reconciled sections", () => {
    const items = reconcileBundle(
      bundleWith([{ id: "f1", targetFieldId: "triage.outcome", value: "accept" }]),
      EMPTY,
    );
    expect(items[0]?.status).toBe("out_of_scope");
  });
});

describe("acceptFinding — the explicit practitioner action", () => {
  it("copies a scalar finding into the record", () => {
    const next = acceptFinding(EMPTY, {
      id: "f1",
      targetFieldId: "analysis.formulation",
      value: "Escape-maintained",
    });
    expect(next.scalar["analysis.formulation"]).toBe("Escape-maintained");
  });

  it("returns new values rather than mutating the ones passed in", () => {
    const values: FormValues = { scalar: {}, groups: {} };
    acceptFinding(values, { id: "f1", targetFieldId: "analysis.formulation", value: "X" });
    expect(values.scalar).toEqual({});
  });

  it("adds a repeatable finding as its own row, keyed by the bundle's rowKey", () => {
    const next = acceptFinding(EMPTY, {
      id: "f1",
      targetFieldId: "behaviour.definition",
      rowKey: "b-1",
      value: "Hits own head with open palm",
    });
    expect(next.groups["behaviour"]).toEqual([
      { rowId: "b-1", values: { "behaviour.definition": "Hits own head with open palm" } },
    ]);
  });

  it("merges a second finding for the same rowKey into the same row", () => {
    const first = acceptFinding(EMPTY, {
      id: "f1",
      targetFieldId: "behaviour.definition",
      rowKey: "b-1",
      value: "Hits own head",
    });
    const second = acceptFinding(first, {
      id: "f2",
      targetFieldId: "behaviour.antecedents",
      rowKey: "b-1",
      value: "Transition requests",
    });
    expect(second.groups["behaviour"]).toHaveLength(1);
    expect(second.groups["behaviour"]![0]!.values).toEqual({
      "behaviour.definition": "Hits own head",
      "behaviour.antecedents": "Transition requests",
    });
  });

  it("refuses a finding aimed outside the reconciled sections and changes nothing", () => {
    const next = acceptFinding(EMPTY, {
      id: "f1",
      targetFieldId: "triage.outcome",
      value: "accept",
    });
    expect(next).toEqual(EMPTY);
  });
});

describe("buildParticipantContext — the Vector to Frame half", () => {
  it("sends tier 0-2 values and never tier 3 interpretation", () => {
    const context = buildParticipantContext({
      caseRef: "case-1",
      pathway: "no_rp",
      preparedAt: "2026-08-18T00:00:00.000Z",
      caseFields: [
        { fieldId: "settings", value: "Group home", sourceDocument: "d", sourceDate: "2026-08-18" },
        {
          fieldId: "analysis.formulation",
          value: "Escape-maintained",
          sourceDocument: "d",
          sourceDate: "2026-08-18",
        },
      ],
    });
    expect(context.values["settings"]).toBe("Group home");
    expect(context.values["analysis.formulation"]).toBeUndefined();
  });

  it("ignores field ids the registry does not know", () => {
    const context = buildParticipantContext({
      caseRef: "case-1",
      pathway: "no_rp",
      preparedAt: "2026-08-18T00:00:00.000Z",
      caseFields: [
        { fieldId: "not.a.registry.field", value: "x", sourceDocument: "d", sourceDate: "2026-08-18" },
      ],
    });
    expect(context.values).toEqual({});
  });
});

describe("FBA approval requirements", () => {
  it("cannot approve on an empty conclusion", () => {
    expect(canApproveFba({})).toBe(false);
    expect(fbaApprovalBlockers({})).toContain("analysis.conclusion");
  });

  it("approves once the conclusion and the findings it rests on are present", () => {
    const values = {
      "analysis.function": "Escape from demand",
      "analysis.maintaining_variables": "Task removal",
      "analysis.conclusion": "Moderate confidence; limited by observation window",
    };
    expect(canApproveFba(values)).toBe(true);
    expect(fbaApprovalBlockers(values)).toEqual([]);
  });

  it("reads what the gate unlocks from the registry, not from a hardcoded list", () => {
    expect(fbaGateUnlocks()).toEqual(registry.pathways.gates["fba.approved"]!.unlocks);
    expect(fbaGateUnlocks()).toEqual(["06", "07", "09"]);
  });
});

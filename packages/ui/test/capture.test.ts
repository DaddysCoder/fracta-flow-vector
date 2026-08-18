import { CAPABILITIES, resolve, type CaseRecord, type FieldEntry } from "@pbs/core";
import { describe, expect, it } from "vitest";
import {
  CAPTURE_INSTANCE_ID,
  isCaptureOnly,
  withoutCaptureEntries,
} from "../src/capture.js";
import { ASSESSMENT_DOCUMENT_ID } from "../src/assessment.js";
import { entriesFrom } from "../src/documentForm.js";
import type { FormValues } from "../src/FormRenderer.js";
import { toTargetDocument } from "../src/registryAdapter.js";

/**
 * Document 05 is a lightweight standalone fallback log. It must never
 * mutate, prefill, or quietly become part of the Document 04 Assessment /
 * FBA Record. These tests assert that from three directions: provenance,
 * what the shell forwards, and what `resolve()` will do with the rows in
 * the *connected* mode Vector has not turned on yet.
 */

const CAPTURE_VALUES: FormValues = {
  scalar: {},
  groups: {
    observation: [
      { rowId: "row-1", values: { "incident.observed": "Shouted during transition, 3 minutes" } },
      { rowId: "row-2", values: { "incident.observed": "Left the room at handover" } },
    ],
  },
};

const captureEntries = entriesFrom(CAPTURE_VALUES, CAPTURE_INSTANCE_ID, "2026-08-18T00:00:00.000Z");

describe("Document 05 rows stay in Document 05", () => {
  it("records every row under its own document instance id", () => {
    expect(captureEntries).toHaveLength(2);
    expect(isCaptureOnly(captureEntries)).toBe(true);
    expect(captureEntries.every((e) => e.sourceDocument === CAPTURE_INSTANCE_ID)).toBe(true);
  });

  it("is stripped out of the case record the shell forwards to documents 04-09", () => {
    const caseFields: FieldEntry[] = [
      {
        fieldId: "settings",
        value: "Group home",
        sourceDocument: "assessment-draft",
        sourceDate: "2026-08-18T00:00:00.000Z",
      },
      ...captureEntries,
    ];
    const forwarded = withoutCaptureEntries(caseFields);
    expect(forwarded).toHaveLength(1);
    expect(forwarded.some((e) => e.fieldId === "incident.observed")).toBe(false);
  });

  it("never prefills a Document 04 field in standalone mode", () => {
    const record: CaseRecord = { fields: captureEntries };
    const target = toTargetDocument(ASSESSMENT_DOCUMENT_ID, "assessment-draft");
    const resolved = resolve(record, target, CAPABILITIES.standalone, new Date("2026-08-18"));
    expect(resolved.tier0).toEqual([]);
    expect(resolved.tier1).toEqual([]);
    expect(resolved.tier2).toEqual([]);
    expect(resolved.tier3).toEqual([]);
  });

  it("never becomes a Document 04 value even in connected mode — evidence only", () => {
    const record: CaseRecord = { fields: captureEntries };
    const target = toTargetDocument(ASSESSMENT_DOCUMENT_ID, "assessment-draft");
    const resolved = resolve(record, target, CAPABILITIES.connected, new Date("2026-08-18"));

    // Not carried in as a value at any tier.
    const valued = [...resolved.tier0, ...resolved.tier1, ...resolved.tier2];
    expect(valued.some((entry) => entry.fieldId === "incident.observed")).toBe(false);

    // Present only as evidence hanging off tier3 fields, whose value is
    // still null — evidence is displayed beside an interpretation, it is
    // never the interpretation.
    const evidenced = resolved.tier3.filter((t) =>
      t.evidence.some((e) => e.fieldId === "incident.observed"),
    );
    expect(evidenced.length).toBeGreaterThan(0);
    expect(evidenced.every((t) => t.value === null)).toBe(true);
    for (const entry of evidenced) {
      for (const evidence of entry.evidence.filter((e) => e.fieldId === "incident.observed")) {
        expect(evidence.sourceDocument).toBe(CAPTURE_INSTANCE_ID);
      }
    }
  });

  it("reaches only the FBA sections the registry says it informs", () => {
    const record: CaseRecord = { fields: captureEntries };
    const target = toTargetDocument(ASSESSMENT_DOCUMENT_ID, "assessment-draft");
    const resolved = resolve(record, target, CAPABILITIES.connected, new Date("2026-08-18"));
    const touched = resolved.tier3
      .filter((t) => t.evidence.some((e) => e.fieldId === "incident.observed"))
      .map((t) => t.fieldId);
    // incident.observed informs 04.4 and 04.6 only.
    expect(touched).toContain("analysis.evidence_reconciliation");
    expect(touched).toContain("analysis.setting_events");
    expect(touched).not.toContain("analysis.conclusion");
  });
});

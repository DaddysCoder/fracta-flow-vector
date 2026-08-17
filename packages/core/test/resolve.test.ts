import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "../src/capabilities.js";
import { InvalidRowIdError, MissingProvenanceError } from "../src/errors.js";
import { resolve } from "../src/resolve.js";
import type { CaseRecord, ResolvedDocument } from "../src/types.js";
import { BSA_2025, BSA_2026, BSP_2026, REFERRAL_1, TRIAGE_1, buildRecord } from "./fixtures.js";

const NOW = new Date("2026-08-17T00:00:00Z");

function byFieldId<T extends { fieldId: string }>(entries: T[]) {
  return Object.fromEntries(entries.map((e) => [e.fieldId, e]));
}

describe("resolve — tier0 (identity, and anything already local)", () => {
  const record = buildRecord();
  const result = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
  const tier0 = byFieldId(result.tier0);

  it("carries an identity fact from wherever it was captured, unconditionally", () => {
    expect(tier0["participant.preferred_name"]).toEqual({
      fieldId: "participant.preferred_name",
      value: "Sam",
      sourceDocument: REFERRAL_1,
      sourceDate: "2025-01-10",
    });
  });

  it("promotes a repeatable row already re-entered directly in the target document, by rowId", () => {
    const behaviour = tier0["behaviour.definition"];
    expect(behaviour).toBeDefined();
    expect(behaviour!.sourceDocument).toBe(BSA_2026.id);
    // Only beh-1 (authored locally) appears — beh-2 (bsa-2025 only) does not.
    expect(behaviour!.value).toEqual([
      {
        rowId: "beh-1",
        value: {
          label: "Exit-seeking",
          description: "Attempts to leave the property unsupervised, most often after 4pm.",
        },
      },
    ]);
  });

  it("never marks a tier0 entry as stale (no such field on the shape)", () => {
    for (const entry of result.tier0) expect(entry).not.toHaveProperty("stale");
  });
});

describe("resolve — tier1 (perishable fact, batched confirm)", () => {
  const record = buildRecord();

  it("surfaces a value recorded in an earlier cycle of the same document type", () => {
    const result = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
    const health = byFieldId(result.tier1)["health.record"];
    expect(health).toBeDefined();
    expect(health!.value).toBe("No known allergies; asthma, reliever as needed.");
    expect(health!.sourceDate).toBe("2025-02-01");
  });

  it.each([
    { label: "fresh", now: new Date("2025-03-15T00:00:00Z"), expectedStale: false }, // 42 days
    { label: "stale", now: new Date("2025-06-01T00:00:00Z"), expectedStale: true }, // 120 days
  ])(
    "computes stale = (now - sourceDate) > stalenessDays for health.record ($label)",
    ({ now, expectedStale }) => {
      const result = resolve(record, BSA_2026, CAPABILITIES.connected, now);
      expect(byFieldId(result.tier1)["health.record"]!.stale).toBe(expectedStale);
    },
  );

  it("resurfaces a perishable fact from referral when compiling the final BSP", () => {
    const result = resolve(record, BSP_2026, CAPABILITIES.connected, NOW);
    const accommodation = byFieldId(result.tier1)["accommodation"];
    expect(accommodation).toEqual({
      fieldId: "accommodation",
      value: "Shared supported independent living, 3 co-residents.",
      sourceDate: "2025-01-10",
      stale: true, // ~19 months old against a 90-day policy
    });
  });
});

describe("resolve — tier2 (observation, pre-ticked bulk-accept)", () => {
  const record = buildRecord();

  it("proposes a carry for a repeatable row that only exists on an earlier document", () => {
    const result = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
    const rows = result.tier2.filter((t) => t.fieldId === "behaviour.definition");
    expect(rows).toEqual([
      {
        fieldId: "behaviour.definition",
        rowId: "beh-2",
        value: { label: "Property damage", description: "Throws objects when routine is disrupted." },
        sourceDocument: BSA_2025,
        proposed: "carry",
      },
    ]);
  });

  it("carries the case's source register forward into a document that only renders it", () => {
    const result = resolve(record, BSP_2026, CAPABILITIES.connected, NOW);
    const rows = result.tier2.filter((t) => t.fieldId === "source.entry");
    expect(rows.map((r) => r.rowId).sort()).toEqual(["src-1", "src-2"]);
    expect(rows.every((r) => r.proposed === "carry" && r.sourceDocument === "source-register-1")).toBe(
      true,
    );
  });
});

describe("resolve — tier3 (interpretation, always blank + evidence)", () => {
  const record: CaseRecord = {
    fields: [
      ...buildRecord().fields,
      // A prior conclusion exists from the earlier BSA/FBA cycle — it
      // must NOT leak through. Tier3 is always null when authored here.
      {
        fieldId: "analysis.conclusion",
        value: "Old conclusion text.",
        sourceDocument: BSA_2025,
        sourceDate: "2025-02-01",
      },
    ],
  };
  const result = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
  const conclusion = byFieldId(result.tier3)["analysis.conclusion"];

  it("is always null, even though a prior value exists elsewhere", () => {
    expect(conclusion).toBeDefined();
    expect(conclusion!.value).toBeNull();
  });

  it("never appears in tier0, tier1, or tier2", () => {
    expect(byFieldId(result.tier0)["analysis.conclusion"]).toBeUndefined();
    expect(byFieldId(result.tier1)["analysis.conclusion"]).toBeUndefined();
    expect(result.tier2.some((t) => t.fieldId === "analysis.conclusion")).toBe(false);
  });

  it("gathers evidence from every field that informs this section (04.9)", () => {
    for (const fieldId of ["risk.matrix_likelihood", "risk.matrix_consequence", "risk.matrix_rating"]) {
      expect(conclusion!.evidence).toContainEqual({
        fieldId,
        rowId: "risk-1",
        value: fieldId === "risk.matrix_likelihood" ? 4 : fieldId === "risk.matrix_consequence" ? 3 : 12,
        sourceDocument: TRIAGE_1,
        sourceDate: "2026-06-05",
      });
    }
  });

  it("always attaches every row of the case's source register, regardless of `informs`", () => {
    expect(conclusion!.evidence).toContainEqual({
      fieldId: "source.entry",
      rowId: "src-1",
      value: { who: "GP", note: "Reviewed GP letter dated 2026-05-20." },
      sourceDocument: "source-register-1",
      sourceDate: "2026-06-01",
    });
    expect(conclusion!.evidence).toContainEqual({
      fieldId: "source.entry",
      rowId: "src-2",
      value: { who: "Support worker", note: "Interview conducted 2026-06-02." },
      sourceDocument: "source-register-1",
      sourceDate: "2026-06-02",
    });
  });

  it("returns exactly the 5 evidence items expected (3 risk-matrix rows + 2 register rows)", () => {
    expect(conclusion!.evidence).toHaveLength(5);
  });
});

describe("resolve — an interpretation quoted (not authored) elsewhere renders instead of blanking", () => {
  const record = buildRecord();
  const result = resolve(record, BSP_2026, CAPABILITIES.connected, NOW);
  const tier0 = byFieldId(result.tier0);

  it("treats a tier3 field only reached via rendersIn as a render, not a fresh interpretation", () => {
    expect(tier0["goals"]).toEqual({
      fieldId: "goals",
      value: "Reduce exit-seeking; increase functional communication for routine changes.",
      sourceDocument: BSA_2026.id,
      sourceDate: "2026-07-15",
    });
    expect(tier0["risk.assessed"]).toBeDefined();
  });

  it("never produces a tier3 entry for it in the rendering document", () => {
    expect(byFieldId(result.tier3)["goals"]).toBeUndefined();
    expect(byFieldId(result.tier3)["risk.assessed"]).toBeUndefined();
  });
});

describe("resolve — standalone mode (caps.crossDocumentPrefill = false)", () => {
  const record = buildRecord();
  const result = resolve(record, BSA_2026, CAPABILITIES.standalone, NOW);

  it("returns empty tier1, tier2, and tier3 — correct, not degraded", () => {
    expect(result.tier1).toEqual([]);
    expect(result.tier2).toEqual([]);
    expect(result.tier3).toEqual([]);
  });

  it("still renders values authored directly in the target document", () => {
    const behaviour = byFieldId(result.tier0)["behaviour.definition"];
    expect(behaviour!.value).toEqual([
      {
        rowId: "beh-1",
        value: {
          label: "Exit-seeking",
          description: "Attempts to leave the property unsupervised, most often after 4pm.",
        },
      },
    ]);
  });

  it("locks off identity data captured in a different standalone document", () => {
    // participant.preferred_name was only ever authored on referral-1 —
    // in standalone mode a bare bsa-2026 template cannot see it.
    expect(byFieldId(result.tier0)["participant.preferred_name"]).toBeUndefined();
  });
});

describe("resolve — provenance is mandatory", () => {
  it("throws when a value has no sourceDocument", () => {
    const record: CaseRecord = {
      fields: [{ fieldId: "participant.preferred_name", value: "X", sourceDocument: "", sourceDate: "2026-01-01" }],
    };
    expect(() => resolve(record, BSA_2026, CAPABILITIES.connected, NOW)).toThrow(
      MissingProvenanceError,
    );
  });

  it("throws when a value has no sourceDate", () => {
    const record: CaseRecord = {
      fields: [{ fieldId: "participant.preferred_name", value: "X", sourceDocument: REFERRAL_1, sourceDate: "" }],
    };
    expect(() => resolve(record, BSA_2026, CAPABILITIES.connected, NOW)).toThrow(
      MissingProvenanceError,
    );
  });
});

describe("resolve — repeatable groups must be keyed by rowId", () => {
  it("throws when a repeatable field's entry has no rowId", () => {
    const record: CaseRecord = {
      fields: [
        {
          fieldId: "behaviour.definition",
          value: { label: "Untracked" },
          sourceDocument: BSA_2025,
          sourceDate: "2025-02-01",
        },
      ],
    };
    expect(() => resolve(record, BSA_2026, CAPABILITIES.connected, NOW)).toThrow(
      InvalidRowIdError,
    );
  });

  it("throws when a scalar field's entry unexpectedly carries a rowId", () => {
    const record: CaseRecord = {
      fields: [
        {
          fieldId: "health.record",
          rowId: "should-not-be-here",
          value: "x",
          sourceDocument: BSA_2025,
          sourceDate: "2025-02-01",
        },
      ],
    };
    expect(() => resolve(record, BSA_2026, CAPABILITIES.connected, NOW)).toThrow(
      InvalidRowIdError,
    );
  });
});

describe("resolve — purity", () => {
  it("produces identical output for identical input", () => {
    const record = buildRecord();
    const a = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
    const b = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
    expect(a).toEqual(b);
  });

  it("does not mutate its inputs", () => {
    const record = buildRecord();
    const snapshot = JSON.parse(JSON.stringify(record));
    resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
    expect(record).toEqual(snapshot);
  });
});

describe("resolve — table-driven tier assignment for the BSA/FBA (bsa-2026)", () => {
  const record = buildRecord();
  const result: ResolvedDocument = resolve(record, BSA_2026, CAPABILITIES.connected, NOW);
  const location = new Map<string, "tier0" | "tier1" | "tier2" | "tier3">();
  for (const e of result.tier0) location.set(e.fieldId, "tier0");
  for (const e of result.tier1) location.set(e.fieldId, "tier1");
  for (const e of result.tier2) if (!location.has(e.fieldId)) location.set(e.fieldId, "tier2");
  for (const e of result.tier3) location.set(e.fieldId, "tier3");

  it.each([
    ["participant.preferred_name", "tier0"],
    ["behaviour.definition", "tier0"], // has a locally-authored row too
    ["health.record", "tier1"],
    ["analysis.conclusion", "tier3"],
  ] as const)("%s resolves into %s", (fieldId, expectedTier) => {
    expect(location.get(fieldId)).toBe(expectedTier);
  });

  it("behaviour.definition also has a tier2 candidate for its cross-only row", () => {
    expect(result.tier2.some((t) => t.fieldId === "behaviour.definition")).toBe(true);
  });
});

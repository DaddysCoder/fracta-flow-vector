import { describe, expect, it } from "vitest";
import { InvalidRowIdError, MissingProvenanceError } from "../src/errors.js";
import { resolve } from "../src/resolve.js";
import type { CaseRecord, ResolvedDocument } from "../src/types.js";
import { TARGET, TARGET_INSTANCE_ID, buildRecord } from "./fixtures.js";

const NOW = new Date("2026-08-17T00:00:00Z");

function byFieldId<T extends { fieldId: string }>(entries: T[]) {
  return Object.fromEntries(entries.map((e) => [e.fieldId, e]));
}

describe("resolve — tier0 (authored locally, render never prompt)", () => {
  const record = buildRecord();
  const result = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
  const tier0 = byFieldId(result.tier0);

  it("prefers the value authored in the target document over any other document's value", () => {
    expect(tier0.applicantName).toEqual({
      fieldId: "applicantName",
      value: "Jordan A. Lee",
      sourceDocument: TARGET_INSTANCE_ID,
      sourceDate: "2026-08-15",
    });
  });

  it("aggregates only the rows of a repeatable field authored locally, by rowId", () => {
    expect(tier0.assets).toBeDefined();
    expect(tier0.assets!.sourceDocument).toBe(TARGET_INSTANCE_ID);
    expect(tier0.assets!.value).toEqual([
      { rowId: "asset-uuid-1", value: { description: "Savings account", amount: 5200 } },
    ]);
  });

  it("never marks tier0 entries as stale (no such field exists on the shape)", () => {
    for (const entry of result.tier0) {
      expect(entry).not.toHaveProperty("stale");
    }
  });

  it("does not surface fields with no locally-authored value", () => {
    expect(tier0.dateOfBirth).toBeUndefined();
    expect(tier0.income).toBeUndefined();
    expect(tier0.dependents).toBeUndefined();
    expect(tier0.bankAccountNumber).toBeUndefined();
  });
});

describe("resolve — tier1 (cross-document scalar, batched confirm)", () => {
  const record = buildRecord();

  it("picks the most recent cross-document entry across all source documents", () => {
    const result = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
    const tier1 = byFieldId(result.tier1);
    expect(tier1.address).toEqual({
      fieldId: "address",
      value: "99 New Ave", // 2026-08-01, newer than intake-1's 2025-01-10
      sourceDate: "2026-08-01",
      stale: false,
    });
  });

  it.each([
    {
      label: "fresh: within the field's staleness window",
      now: new Date("2026-07-25T00:00:00Z"), // 5 days after income's 2026-07-20
      expectedStale: false,
    },
    {
      label: "stale: past the field's staleness window",
      now: new Date("2026-09-01T00:00:00Z"), // 43 days after income's 2026-07-20 (limit 30)
      expectedStale: true,
    },
  ])("computes stale = (now - sourceDate) > stalenessDays — $label", ({ now, expectedStale }) => {
    const result = resolve(record, TARGET, { crossDocumentPrefill: true }, now);
    const income = byFieldId(result.tier1).income;
    expect(income).toBeDefined();
    expect(income!.stale).toBe(expectedStale);
  });

  it("does not include fields already resolved locally in tier0", () => {
    const result = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
    expect(byFieldId(result.tier1).applicantName).toBeUndefined();
  });
});

describe("resolve — tier2 (repeatable rows carried cross-document, pre-ticked)", () => {
  const record = buildRecord();
  const result = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);

  it("proposes a carry for each cross-document row not already authored locally", () => {
    const dependentRows = result.tier2.filter((t) => t.fieldId === "dependents");
    expect(dependentRows).toEqual([
      {
        fieldId: "dependents",
        rowId: "dep-uuid-1",
        value: { name: "Alex Lee", dob: "2015-03-01" },
        sourceDocument: "dependents-schedule-1",
        proposed: "carry",
      },
    ]);
  });

  it("resolves repeatable rows per rowId, not by array position", () => {
    const assetRows = result.tier2.filter((t) => t.fieldId === "assets");
    // asset-uuid-1 was already carried into app-1 (tier0) even though its
    // cross-document entry appears earlier in the fixture array — it must
    // be excluded from tier2 by rowId match, not by array index.
    expect(assetRows.map((r) => r.rowId)).toEqual(["asset-uuid-2"]);
    expect(assetRows[0]).toEqual({
      fieldId: "assets",
      rowId: "asset-uuid-2",
      value: { description: "Car", amount: 8000 },
      sourceDocument: "financial-declaration-1",
      proposed: "carry",
    });
  });
});

describe("resolve — tier3 (no value anywhere, blank + evidence)", () => {
  const record = buildRecord();
  const result = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
  const tier3 = byFieldId(result.tier3);

  it("returns null for fields with no value in any document", () => {
    expect(tier3.bankAccountNumber).toBeDefined();
    expect(tier3.bankAccountNumber!.value).toBeNull();
  });

  it("gathers evidence from fields whose `informs` includes the missing field", () => {
    const evidence = tier3.bankAccountNumber!.evidence;
    expect(evidence).toContainEqual({
      kind: "field",
      fieldId: "income",
      sourceDocument: "financial-declaration-1",
      sourceDate: "2026-07-20",
    });
  });

  it("gathers evidence from matching register entries", () => {
    const evidence = tier3.bankAccountNumber!.evidence;
    expect(evidence).toContainEqual({
      kind: "register",
      registerEntryId: "reg-financial-declaration",
      documentId: "financial-declaration",
      label: "Financial Declaration (on file)",
    });
    expect(evidence).toContainEqual({
      kind: "register",
      registerEntryId: "reg-bank-verification-letter",
      documentId: "bank-verification-letter",
      label: "Bank Verification Letter",
    });
  });
});

describe("resolve — standalone mode (caps.crossDocumentPrefill = false)", () => {
  const record = buildRecord();
  const result = resolve(record, TARGET, { crossDocumentPrefill: false }, NOW);

  it("returns empty tier1, tier2, and tier3 — correct, not degraded", () => {
    expect(result.tier1).toEqual([]);
    expect(result.tier2).toEqual([]);
    expect(result.tier3).toEqual([]);
  });

  it("still returns tier0 values authored in the current document", () => {
    const tier0 = byFieldId(result.tier0);
    expect(tier0.applicantName?.value).toBe("Jordan A. Lee");
    expect(tier0.assets?.value).toEqual([
      { rowId: "asset-uuid-1", value: { description: "Savings account", amount: 5200 } },
    ]);
  });

  it("excludes fields that only have cross-document values", () => {
    const tier0 = byFieldId(result.tier0);
    expect(tier0.dateOfBirth).toBeUndefined();
    expect(tier0.income).toBeUndefined();
    expect(tier0.dependents).toBeUndefined();
  });
});

describe("resolve — provenance is mandatory", () => {
  it("throws when a value has no sourceDocument", () => {
    const record: CaseRecord = {
      fields: [
        { fieldId: "applicantName", value: "No Source", sourceDocument: "", sourceDate: "2026-01-01" },
      ],
      registerEntries: [],
    };
    expect(() => resolve(record, TARGET, { crossDocumentPrefill: true }, NOW)).toThrow(
      MissingProvenanceError,
    );
  });

  it("throws when a value has no sourceDate", () => {
    const record: CaseRecord = {
      fields: [
        { fieldId: "applicantName", value: "No Date", sourceDocument: "intake-1", sourceDate: "" },
      ],
      registerEntries: [],
    };
    expect(() => resolve(record, TARGET, { crossDocumentPrefill: true }, NOW)).toThrow(
      MissingProvenanceError,
    );
  });
});

describe("resolve — repeatable groups must be keyed by rowId", () => {
  it("throws when a repeatable field's entry has no rowId", () => {
    const record: CaseRecord = {
      fields: [
        {
          fieldId: "assets",
          value: { description: "Untracked asset", amount: 1 },
          sourceDocument: "financial-declaration-1",
          sourceDate: "2026-07-20",
        },
      ],
      registerEntries: [],
    };
    expect(() => resolve(record, TARGET, { crossDocumentPrefill: true }, NOW)).toThrow(
      InvalidRowIdError,
    );
  });

  it("throws when a scalar field's entry unexpectedly carries a rowId", () => {
    const record: CaseRecord = {
      fields: [
        {
          fieldId: "income",
          rowId: "should-not-be-here",
          value: 1000,
          sourceDocument: "financial-declaration-1",
          sourceDate: "2026-07-20",
        },
      ],
      registerEntries: [],
    };
    expect(() => resolve(record, TARGET, { crossDocumentPrefill: true }, NOW)).toThrow(
      InvalidRowIdError,
    );
  });
});

describe("resolve — purity", () => {
  it("produces identical output for identical input regardless of call order", () => {
    const record = buildRecord();
    const a = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
    const b = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
    expect(a).toEqual(b);
  });

  it("does not mutate its inputs", () => {
    const record = buildRecord();
    const snapshot = JSON.parse(JSON.stringify(record));
    resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
    expect(record).toEqual(snapshot);
  });
});

describe("resolve — table-driven tier assignment", () => {
  const record = buildRecord();
  const result: ResolvedDocument = resolve(record, TARGET, { crossDocumentPrefill: true }, NOW);
  const location = new Map<string, "tier0" | "tier1" | "tier2" | "tier3">();
  for (const e of result.tier0) location.set(e.fieldId, "tier0");
  for (const e of result.tier1) location.set(e.fieldId, "tier1");
  for (const e of result.tier2) if (!location.has(e.fieldId)) location.set(e.fieldId, "tier2");
  for (const e of result.tier3) location.set(e.fieldId, "tier3");

  it.each([
    ["applicantName", "tier0"],
    ["assets", "tier0"], // has a locally-authored row, so the field also appears in tier0
    ["dateOfBirth", "tier1"],
    ["address", "tier1"],
    ["income", "tier1"],
    ["dependents", "tier2"],
    ["bankAccountNumber", "tier3"],
  ] as const)("%s resolves into %s", (fieldId, expectedTier) => {
    expect(location.get(fieldId)).toBe(expectedTier);
  });
});

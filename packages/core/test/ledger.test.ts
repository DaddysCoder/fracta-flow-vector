import { describe, expect, it } from "vitest";
import {
  EMPTY_LEDGER,
  appendTransition,
  hashValue,
  historyFor,
  latestTransition,
  type LedgerRecord,
} from "../src/ledger.js";

function record(overrides: Partial<LedgerRecord> = {}): LedgerRecord {
  return {
    fieldId: "analysis.conclusion",
    fromDocument: "bsa-2025",
    toDocument: "bsa-2026",
    transition: "carry",
    actor: "practitioner-1",
    timestamp: "2026-07-01T00:00:00Z",
    priorValueHash: hashValue("Old conclusion text."),
    ...overrides,
  };
}

describe("ledger — append-only", () => {
  it("starts empty", () => {
    expect(EMPTY_LEDGER).toEqual([]);
  });

  it("never mutates the ledger it's given — returns a new array", () => {
    const before = EMPTY_LEDGER;
    const after = appendTransition(before, record());
    expect(before).toEqual([]);
    expect(after).toHaveLength(1);
    expect(after).not.toBe(before);
  });

  it("freezes appended records so history can't be rewritten in place", () => {
    const ledger = appendTransition(EMPTY_LEDGER, record());
    expect(Object.isFrozen(ledger[0])).toBe(true);
    expect(() => {
      // @ts-expect-error deliberately attempting a forbidden mutation
      ledger[0].transition = "retire";
    }).toThrow();
  });

  it("accumulates records across repeated appends without disturbing earlier ones", () => {
    let ledger = EMPTY_LEDGER;
    ledger = appendTransition(ledger, record({ transition: "new", fromDocument: null, priorValueHash: null }));
    ledger = appendTransition(ledger, record({ transition: "confirm" }));
    ledger = appendTransition(ledger, record({ transition: "retire" }));
    expect(ledger.map((r) => r.transition)).toEqual(["new", "confirm", "retire"]);
  });
});

describe("ledger — history and latest transition", () => {
  it("finds only the records matching a given field and row", () => {
    let ledger = EMPTY_LEDGER;
    ledger = appendTransition(ledger, record({ fieldId: "behaviour.definition", rowId: "beh-1" }));
    ledger = appendTransition(ledger, record({ fieldId: "behaviour.definition", rowId: "beh-2" }));
    ledger = appendTransition(ledger, record({ fieldId: "behaviour.definition", rowId: "beh-1", transition: "revise" }));

    const history = historyFor(ledger, "behaviour.definition", "beh-1");
    expect(history.map((r) => r.transition)).toEqual(["carry", "revise"]);
  });

  it("treats scalar fields (no rowId) distinctly from any repeatable row", () => {
    let ledger = EMPTY_LEDGER;
    ledger = appendTransition(ledger, record({ fieldId: "health.record" })); // no rowId
    ledger = appendTransition(ledger, record({ fieldId: "health.record", rowId: "unexpected" }));
    expect(historyFor(ledger, "health.record")).toHaveLength(1);
  });

  it("returns the last matching record as the current state", () => {
    let ledger = EMPTY_LEDGER;
    ledger = appendTransition(ledger, record({ transition: "carry" }));
    ledger = appendTransition(ledger, record({ transition: "update" }));
    expect(latestTransition(ledger, "analysis.conclusion")?.transition).toBe("update");
  });

  it("returns undefined when the field/row was never recorded", () => {
    expect(latestTransition(EMPTY_LEDGER, "nothing.here")).toBeUndefined();
  });
});

describe("hashValue", () => {
  it("is deterministic for identical values", () => {
    expect(hashValue({ a: 1, b: "x" })).toBe(hashValue({ a: 1, b: "x" }));
  });

  it("distinguishes different values", () => {
    expect(hashValue("old text")).not.toBe(hashValue("new text"));
  });

  it("treats null and undefined the same (no prior value)", () => {
    expect(hashValue(null)).toBe(hashValue(undefined));
  });
});

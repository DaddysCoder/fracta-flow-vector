import { describe, expect, it } from "vitest";
import { flattenValuesForExport, type FormValues } from "../src/FormRenderer.js";

describe("flattenValuesForExport", () => {
  it("carries scalar values through unchanged", () => {
    const values: FormValues = { scalar: { "participant.preferred_name": "Sam" }, groups: {} };
    expect(flattenValuesForExport(values)).toEqual({ "participant.preferred_name": "Sam" });
  });

  it("flattens a repeatable group's rows into one array per field, in row order", () => {
    const values: FormValues = {
      scalar: {},
      groups: {
        source: [
          { rowId: "a", values: { "source.entry": "First source" } },
          { rowId: "b", values: { "source.entry": "Second source" } },
        ],
      },
    };
    expect(flattenValuesForExport(values)).toEqual({
      "source.entry": ["First source", "Second source"],
    });
  });

  it("drops empty values from a row rather than recording a blank entry", () => {
    const values: FormValues = {
      scalar: {},
      groups: {
        source: [
          { rowId: "a", values: { "source.entry": "" } },
          { rowId: "b", values: { "source.entry": "Only real one" } },
        ],
      },
    };
    expect(flattenValuesForExport(values)).toEqual({ "source.entry": ["Only real one"] });
  });

  it("keeps each field in a multi-field group independent", () => {
    const values: FormValues = {
      scalar: {},
      groups: {
        rrp: [
          { rowId: "a", values: { "rrp.circumstances": "Circumstance A", "rrp.procedure": "Procedure A" } },
          { rowId: "b", values: { "rrp.circumstances": "Circumstance B" } },
        ],
      },
    };
    expect(flattenValuesForExport(values)).toEqual({
      "rrp.circumstances": ["Circumstance A", "Circumstance B"],
      "rrp.procedure": ["Procedure A"],
    });
  });

  it("does not mutate scalar values while merging groups", () => {
    const values: FormValues = {
      scalar: { "participant.preferred_name": "Sam" },
      groups: { source: [{ rowId: "a", values: { "source.entry": "A source" } }] },
    };
    const flat = flattenValuesForExport(values);
    expect(flat).toEqual({
      "participant.preferred_name": "Sam",
      "source.entry": ["A source"],
    });
    expect(values.scalar).toEqual({ "participant.preferred_name": "Sam" });
  });
});

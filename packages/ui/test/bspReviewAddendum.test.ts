import { describe, expect, it } from "vitest";
import { registry } from "@pbs/registry";
import {
  BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS,
  BSP_REVIEW_ADDENDUM_DOCUMENT_ID,
} from "../src/bspReviewAddendum.js";

describe("BSP Review / Change Addendum (document 13)", () => {
  it("is registered with all eight sections", () => {
    const doc = registry.documents[BSP_REVIEW_ADDENDUM_DOCUMENT_ID];
    expect(doc).toBeDefined();
    expect(doc?.title).toBe("BSP Review / Change Addendum");
    expect(doc?.sections.map((s) => s.id)).toEqual([
      "13.1",
      "13.2",
      "13.3",
      "13.4",
      "13.5",
      "13.6",
      "13.7",
      "13.8",
    ]);
    // Applies to any plan variant being reviewed, not just one pathway.
    expect(doc?.pathways.sort()).toEqual(["comprehensive", "interim", "no_rp"]);
  });

  it("asks every field it registers in one of its own eight sections", () => {
    const doc = registry.documents[BSP_REVIEW_ADDENDUM_DOCUMENT_ID]!;
    const fields = registry.fields.filter((f) => doc.sections.some((s) => s.id === f.askedIn));
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field.id.startsWith("bspReview.")).toBe(true);
    }
  });

  it("always requires the plan reference, review date and declaration", () => {
    expect(BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS).toEqual([
      "bspReview.plan_reference",
      "bspReview.review_date",
      "bspReview.declaration",
    ]);
  });
});

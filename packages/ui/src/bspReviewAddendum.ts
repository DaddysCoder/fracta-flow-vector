import type { VisibilityRule } from "./visibility.js";

export const BSP_REVIEW_ADDENDUM_DOCUMENT_ID = "13";

/**
 * No conditional branches: every field is always shown, matching the same
 * judgement call `BSA_VISIBILITY_RULES` made for document 04 — a review
 * applies to any BSP variant (No-RP, Interim or Comprehensive), so nothing
 * here depends on which one it is.
 */
export const BSP_REVIEW_ADDENDUM_VISIBILITY_RULES: VisibilityRule[] = [];

export const BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS = [
  "bspReview.plan_reference",
  "bspReview.review_date",
  "bspReview.declaration",
];

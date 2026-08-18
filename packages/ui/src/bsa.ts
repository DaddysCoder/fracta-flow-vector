import type { VisibilityRule } from "./visibility.js";

export const BSA_DOCUMENT_ID = "04";

/**
 * No conditional branches identified for the Combined BSA/FBA — every
 * field asked here is either always shown (identity, behaviour, analysis
 * sections) or its own repeatable row (behaviour definitions, observation
 * scaffold entries), which the generic renderer/RepeatableGroup already
 * handle without a visibility rule.
 */
export const BSA_VISIBILITY_RULES: VisibilityRule[] = [];

/**
 * Only `analysis.conclusion` is required outright: the registry itself
 * marks it "Hard clinical gate. Approval here sets fba.approved" — no
 * other field on this document carries an equivalent signal, so nothing
 * else is hard-required (matching the judgement call `SourceForm` made
 * for its own registry-silent minimum).
 */
export const BSA_ALWAYS_REQUIRED_FIELD_IDS = ["analysis.conclusion"];

import type { VisibilityRule } from "./visibility.js";

export const SOURCE_DOCUMENT_ID = "03";

/**
 * The Source and Consultation Register has one repeatable field
 * (`source.entry`) and no conditional branches — no rule set needed. See
 * CONTRADICTIONS.md for the gap between this single free-text field and
 * the richer per-source/per-consultation breakdown the schema pack
 * describes narratively.
 */
export const SOURCE_VISIBILITY_RULES: VisibilityRule[] = [];

/** Nothing is hard-required: the registry places no minimum-entry rule
 * on this register, so submitting with zero sources logged is valid. */
export const SOURCE_ALWAYS_REQUIRED_FIELD_IDS: string[] = [];

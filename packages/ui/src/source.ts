import type { VisibilityRule } from "./visibility.js";

export const SOURCE_DOCUMENT_ID = "03";

/**
 * The Source and Consultation Register has two repeatable registers
 * (03.A Document register, 03.B split into `consultation_participant`
 * and `consultation_other` groups) and no conditional branches — no
 * rule set needed.
 */
export const SOURCE_VISIBILITY_RULES: VisibilityRule[] = [];

/** Nothing is hard-required: the registry places no minimum-entry rule
 * on this register, so submitting with zero sources or consultations
 * logged is valid. */
export const SOURCE_ALWAYS_REQUIRED_FIELD_IDS: string[] = [];

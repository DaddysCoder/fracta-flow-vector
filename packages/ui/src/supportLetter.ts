import type { VisibilityRule } from "./visibility.js";

export const SUPPORT_LETTER_DOCUMENT_ID = "11";

/** No conditional branches — every section always applies to a Support
 * Letter regardless of pathway (the document itself is available under
 * all three pathways; only the quoted RRP Assessment content is
 * pathway-restricted, and that's the registry's `pathways` field on
 * those fields, not a UI visibility rule). */
export const SUPPORT_LETTER_VISIBILITY_RULES: VisibilityRule[] = [];

export const SUPPORT_LETTER_ALWAYS_REQUIRED_FIELD_IDS = [
  "letter.participant_name",
  "letter.author_name",
];

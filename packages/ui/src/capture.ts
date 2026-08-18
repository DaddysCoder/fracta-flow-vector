import type { FieldEntry } from "@pbs/core";
import type { VisibilityRule } from "./visibility.js";

export const CAPTURE_DOCUMENT_ID = "05";

/** Instance id every Document 05 row is authored under. Deliberately its
 * own id, distinct from the Assessment/FBA Record's — provenance is what
 * keeps the two apart. */
export const CAPTURE_INSTANCE_ID = "capture-draft";

/**
 * Document 05 — Behaviour Data Capture.
 *
 * A **lightweight standalone fallback only**: somewhere to log observed
 * incidents when no assessment tool is in play. It is not an assessment,
 * not an FBA, and it never edits the Document 04 record. Rows recorded
 * here carry their own `sourceDocument` and stay there; the registry's
 * `informs` on `incident.observed` makes them *evidence* attached to the
 * FBA's tier-3 fields in connected mode — evidence is displayed beside a
 * field, it never becomes the field's value (see `resolve()`: tier3
 * always comes back `value: null` with `evidence[]`).
 *
 * Nothing in this module writes into another document. `captureEntries`
 * is the only thing it produces, and the app shell keeps it in its own
 * bucket rather than folding it into the case record documents 04-09
 * read from.
 */
export const CAPTURE_VISIBILITY_RULES: VisibilityRule[] = [];

/** Nothing is hard-required: an empty capture log is a valid state. */
export const CAPTURE_ALWAYS_REQUIRED_FIELD_IDS: string[] = [];

/**
 * Guard used by the app shell and asserted by tests: no Document 05 row
 * may ever be handed to a document that authors the FBA record. If this
 * ever returns false, standalone capture has started leaking into the
 * assessment.
 */
export function isCaptureOnly(entries: FieldEntry[]): boolean {
  return entries.every((e) => e.sourceDocument === CAPTURE_INSTANCE_ID);
}

/** Strips anything captured in Document 05 out of a case record. The app
 * shell calls this on the fields it forwards to documents 04-09, so the
 * separation is structural rather than a convention someone has to
 * remember. */
export function withoutCaptureEntries(entries: FieldEntry[]): FieldEntry[] {
  return entries.filter((e) => e.sourceDocument !== CAPTURE_INSTANCE_ID);
}

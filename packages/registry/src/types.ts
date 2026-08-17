/**
 * @pbs/registry describes the static schema of a case: which documents
 * exist, which fields each document carries, how those fields relate to
 * one another, and which documents are known to be on file for a case
 * (the "register") even if their contents haven't been transcribed into
 * structured fields yet.
 *
 * This package is deliberately inert data — it has no runtime logic of
 * its own. Consumers (like @pbs/core's test suite) adapt these fixtures
 * into whatever shape their own APIs expect.
 */

export interface FieldDefinition {
  /** Stable identifier, unique across the whole registry. */
  id: string;
  label: string;
  /**
   * True when this field is part of a repeatable group (e.g. a schedule
   * of assets or dependents) and must be resolved per row, keyed by a
   * row uuid, rather than as a single scalar value.
   */
  repeatable: boolean;
  /**
   * How many days may elapse between a value's sourceDate and "now"
   * before that value is considered stale for cross-document prefill.
   */
  stalenessDays: number;
  /**
   * Field ids that a populated value of *this* field counts as evidence
   * towards, when those other fields can't be resolved directly (tier3).
   * e.g. an `income` value was read off a bank statement, so it also
   * counts as evidence that a `bankAccountNumber` might be found there.
   */
  informs: string[];
}

export interface DocumentDefinition {
  /** Document type id, e.g. "benefit-application". */
  id: string;
  label: string;
  /** Field ids this document type is expected to carry. */
  fields: string[];
}

/**
 * An entry in a case's document register: a document known to be on file
 * for the case, and which fields it is expected to contain — regardless
 * of whether those fields have actually been transcribed yet. Used to
 * back tier3 evidence ("we don't have a value, but here's where to look").
 */
export interface RegisterEntry {
  id: string;
  /** Document type id this register entry refers to. */
  documentId: string;
  label: string;
  fieldIds: string[];
}

export interface Registry {
  fields: Record<string, FieldDefinition>;
  documents: Record<string, DocumentDefinition>;
  registerEntries: RegisterEntry[];
}

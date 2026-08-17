/**
 * Schema for a single field, scoped to one resolution. `@pbs/core` never
 * imports a registry itself — resolve() is pure, so all schema knowledge
 * (repeatability, staleness policy, informs relationships) flows in
 * through `TargetDocument.fields`. Callers typically build this array by
 * adapting a real registry (see @pbs/registry) for the document type
 * being resolved.
 */
export interface FieldSchema {
  fieldId: string;
  /**
   * True when the field belongs to a repeatable group (e.g. a schedule
   * of assets) and must be resolved per row, keyed by `rowId`.
   */
  repeatable: boolean;
  /** Days after which a cross-document value is considered stale. */
  stalenessDays: number;
  /**
   * Field ids that a populated value of *this* field counts as evidence
   * towards, when those fields can't be resolved directly.
   */
  informs: string[];
}

/** The document being resolved: its identity, type, and field schema. */
export interface TargetDocument {
  /** Document instance id. Values authored under this id are "local". */
  id: string;
  /** Document type id, purely informational. */
  type: string;
  fields: FieldSchema[];
}

/**
 * A single recorded value, with mandatory provenance. `rowId` is required
 * for entries belonging to a repeatable field, and must be a stable
 * identifier (e.g. a uuid) — never a positional index — since rows are
 * always resolved by matching `rowId`, not array position.
 */
export interface FieldEntry {
  fieldId: string;
  rowId?: string;
  value: unknown;
  /** Document instance id this value was authored in. */
  sourceDocument: string;
  /** ISO 8601 date string. */
  sourceDate: string;
}

/**
 * A document known to be on file for the case, and which fields it is
 * expected to carry — regardless of whether those fields have been
 * transcribed into `FieldEntry` values yet. Backs tier3 evidence.
 */
export interface RegisterEntry {
  id: string;
  documentId: string;
  label: string;
  fieldIds: string[];
}

/** Everything known about the case so far, across all its documents. */
export interface CaseRecord {
  fields: FieldEntry[];
  registerEntries: RegisterEntry[];
}

export interface Capabilities {
  /**
   * When false, resolution is standalone: only values already authored
   * in the target document are surfaced (tier0). No cross-document
   * prefill, confirmation, carry, or evidence gathering is attempted —
   * tier1/2/3 come back empty. This is a correct, first-class mode, not
   * a degraded fallback.
   */
  crossDocumentPrefill: boolean;
}

export interface Tier0Entry {
  fieldId: string;
  /** For repeatable fields: an array of `{ rowId, value }` rows. */
  value: unknown;
  sourceDocument: string;
  sourceDate: string;
}

export interface Tier1Entry {
  fieldId: string;
  value: unknown;
  sourceDate: string;
  stale: boolean;
}

export interface Tier2Entry {
  fieldId: string;
  rowId?: string;
  value: unknown;
  sourceDocument: string;
  proposed: "carry";
}

export type EvidenceRef =
  | {
      kind: "field";
      fieldId: string;
      sourceDocument: string;
      sourceDate: string;
    }
  | {
      kind: "register";
      registerEntryId: string;
      documentId: string;
      label: string;
    };

export interface Tier3Entry {
  fieldId: string;
  value: null;
  evidence: EvidenceRef[];
}

export interface ResolvedDocument {
  tier0: Tier0Entry[];
  tier1: Tier1Entry[];
  tier2: Tier2Entry[];
  tier3: Tier3Entry[];
}

export interface RepeatableRow {
  rowId: string;
  value: unknown;
}

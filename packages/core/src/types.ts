/**
 * `@pbs/core` never imports `@pbs/registry` — resolve() is pure, so all
 * schema knowledge flows in through `TargetDocument.fields`. Callers
 * adapt a real field registry (see `@pbs/registry`) into this shape.
 *
 * Field tier is intrinsic to the field (a registry fact, not something
 * resolve() infers): 0 identity, 1 perishable fact, 2 observation,
 * 3 interpretation. `section` is the field's own authoring location
 * (registry's `askedIn`); `rendersIn`/`informs` are the section ids
 * where its value is reused, or merely evidenced, elsewhere.
 */
export interface FieldSchema {
  fieldId: string;
  tier: 0 | 1 | 2 | 3;
  repeatable: boolean;
  /** Days after which a cross-document value is considered stale. Only
   * meaningful for tier1 fields. */
  stalenessDays: number | null;
  /** Section id where this field is authored (registry's `askedIn`). */
  section: string;
  /** Section ids where this field's value is reused/displayed as-is. */
  rendersIn: string[];
  /** Section ids this field feeds as evidence, without being rendered there. */
  informs: string[];
  /**
   * True for the field(s) constituting the case's source/consultation
   * register (registry's `source.entry`). Every recorded row of a
   * register field is always attached as evidence to every tier3 field
   * in scope, regardless of `informs`.
   */
  isCaseRegister?: boolean;
}

/** The document being resolved: its identity, the sections it owns, and
 * the complete field schema the case is authored against. */
export interface TargetDocument {
  /** Document instance id. Values authored under this id are "local". */
  id: string;
  /** Section ids that belong to this document. */
  sections: string[];
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

/** Everything known about the case so far, across all its documents. */
export interface CaseRecord {
  fields: FieldEntry[];
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

export interface EvidenceRef {
  fieldId: string;
  rowId?: string;
  value: unknown;
  sourceDocument: string;
  sourceDate: string;
}

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

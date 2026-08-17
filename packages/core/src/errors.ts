export class PbsCoreError extends Error {}

/** Errors raised by resolve() specifically. */
export class ResolveError extends PbsCoreError {}

/** Thrown when a `FieldEntry` is missing `sourceDocument` or `sourceDate`. */
export class MissingProvenanceError extends ResolveError {
  constructor(fieldId: string, index: number) {
    super(
      `Field entry "${fieldId}" at index ${index} has no provenance ` +
        "(sourceDocument and sourceDate are both required).",
    );
    this.name = "MissingProvenanceError";
  }
}

/** Thrown when a repeatable field's rows aren't keyed by rowId, or a
 * scalar field's entry unexpectedly carries one. */
export class InvalidRowIdError extends ResolveError {
  constructor(fieldId: string, index: number, reason: string) {
    super(`Field entry "${fieldId}" at index ${index} ${reason}.`);
    this.name = "InvalidRowIdError";
  }
}

/** Thrown when code attempts to change a released document version
 * directly instead of going through `correctDocument`. */
export class ReleasedDocumentImmutableError extends PbsCoreError {
  constructor(documentId: string, action: string) {
    super(
      `Document "${documentId}" is released and immutable — cannot ${action}. ` +
        "Use correctDocument() to create a successor version.",
    );
    this.name = "ReleasedDocumentImmutableError";
  }
}

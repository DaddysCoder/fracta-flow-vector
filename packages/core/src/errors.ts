export class ResolveError extends Error {}

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

import type { FieldSchema, TargetDocument } from "./types.js";

export function intersects(a: string[], b: string[]): boolean {
  return a.some((x) => b.includes(x));
}

/** Field is asked directly within this document's own sections. */
export function isAuthoredHere(schema: FieldSchema, doc: TargetDocument): boolean {
  return doc.sections.includes(schema.section);
}

/** Field's value is reused/quoted within this document, via cross-reference. */
export function isRenderedHere(schema: FieldSchema, doc: TargetDocument): boolean {
  return intersects(schema.rendersIn, doc.sections);
}

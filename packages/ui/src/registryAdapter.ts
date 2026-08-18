import type { FieldSchema, PathwayPermissions, RrpClassification, TargetDocument } from "@pbs/core";
import { registry } from "@pbs/registry";

/**
 * Adapts real registry data into the shape `resolve()` expects.
 * `@pbs/core` never imports `@pbs/registry` — every consumer of resolve()
 * owns this translation itself (see `@pbs/core`'s own test fixtures for
 * the same pattern).
 */
const registerSectionIds = new Set(
  Object.values(registry.documents)
    .filter((doc) => /source and consultation register/i.test(doc.title))
    .flatMap((doc) => doc.sections.map((s) => s.id)),
);

export function toFieldSchema(fieldId: string): FieldSchema {
  const def = registry.fields.find((f) => f.id === fieldId);
  if (!def) throw new Error(`Unknown registry field "${fieldId}"`);
  return {
    fieldId: def.id,
    tier: def.tier,
    repeatable: def.repeatable,
    stalenessDays: def.stalenessDays,
    section: def.askedIn,
    rendersIn: def.rendersIn,
    informs: def.informs,
    ...(registerSectionIds.has(def.askedIn) ? { isCaseRegister: true } : {}),
    ...(def.group === "strategy_instance" ? { isStrategyInstance: true } : {}),
  };
}

/** The complete field schema every case is authored against — resolve()
 * itself decides what's in scope for a given document. */
export const ALL_FIELD_SCHEMAS: FieldSchema[] = registry.fields.map((f) => toFieldSchema(f.id));

export function toTargetDocument(documentId: string, instanceId: string): TargetDocument {
  const doc = registry.documents[documentId];
  if (!doc) throw new Error(`Unknown registry document "${documentId}"`);
  return {
    id: instanceId,
    sections: doc.sections.map((s) => s.id),
    fields: ALL_FIELD_SCHEMAS,
  };
}

export function toPathwayPermissions(classification: RrpClassification): PathwayPermissions {
  const state = registry.pathways.states[classification];
  if (!state) throw new Error(`Unknown RRP classification "${classification}"`);
  return { permits: state.permits, forbids: state.forbids, blocks: state.blocks };
}

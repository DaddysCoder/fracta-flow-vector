import {
  CAPABILITIES,
  checkAuthoringGates,
  checkReleaseGates,
  resolve,
  type Capabilities,
  type CaseRecord,
  type FieldEntry,
  type GateViolation,
  type InterimSafeguard,
  type Pathway,
} from "@pbs/core";
import { registry, type DocumentDef, type FieldDef } from "@pbs/registry";
import type { FormValues } from "./FormRenderer.js";
import { toTargetDocument } from "./registryAdapter.js";

/**
 * Shared, registry-driven plumbing for every document form. Documents
 * 01-03 each grew their own copy of this; documents 04-09 share it
 * instead, so "which fields does this document ask" and "how does a
 * document read a quoted value in standalone mode" have exactly one
 * answer.
 *
 * Nothing here is document-specific: everything is derived from the
 * registry by document id.
 */

export function documentDef(documentId: string): DocumentDef {
  const doc = registry.documents[documentId];
  if (!doc) throw new Error(`registry is missing document "${documentId}"`);
  return doc;
}

function sectionIds(documentId: string): string[] {
  return documentDef(documentId).sections.map((s) => s.id);
}

/** Fields asked in one of this document's own sections. */
export function documentFields(documentId: string): FieldDef[] {
  const sections = sectionIds(documentId);
  return registry.fields.filter((f) => sections.includes(f.askedIn));
}

/** Fields quoted into this document from elsewhere (registry `rendersIn`
 * only — never authored here). Rendered read-only. */
export function quotedFields(documentId: string): FieldDef[] {
  const sections = sectionIds(documentId);
  return registry.fields.filter(
    (f) => !sections.includes(f.askedIn) && f.rendersIn.some((s) => sections.includes(s)),
  );
}

/**
 * Resolves this document's quoted values from everything known about the
 * case so far.
 *
 * Standalone by default (MD-005/MD-006, CONTRADICTIONS.md #5): every one
 * of the nine documents must open and complete with no other tool's data
 * present, so cross-document prefill is locked off and quoted fields
 * render "Not yet available" until connected mode is turned on as a
 * deployment-mode switch. `caps` is a parameter, never a hardcoded
 * constant inside a form.
 */
export function quotedValuesFor(input: {
  documentId: string;
  instanceId: string;
  priorFields: FieldEntry[];
  now: Date;
  caps?: Capabilities;
}): Record<string, unknown> {
  const caseRecord: CaseRecord = { fields: input.priorFields };
  const target = toTargetDocument(input.documentId, input.instanceId);
  const resolved = resolve(caseRecord, target, input.caps ?? CAPABILITIES.standalone, input.now);
  const merged: Record<string, unknown> = {};
  for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
    merged[entry.fieldId] = entry.value;
  }
  return merged;
}

/** Flattens a repeatable group's rows into FieldEntry[], keyed by rowId —
 * never by array position. */
export function flattenGroups(
  groups: FormValues["groups"],
  sourceDocument: string,
  sourceDate: string,
): FieldEntry[] {
  const entries: FieldEntry[] = [];
  for (const rows of Object.values(groups)) {
    for (const row of rows) {
      for (const [fieldId, value] of Object.entries(row.values)) {
        entries.push({ fieldId, value, rowId: row.rowId, sourceDocument, sourceDate });
      }
    }
  }
  return entries;
}

/** Every value this document authored, as provenance-carrying entries. */
export function entriesFrom(
  values: FormValues,
  sourceDocument: string,
  sourceDate: string,
): FieldEntry[] {
  const scalar: FieldEntry[] = Object.entries(values.scalar).map(([fieldId, value]) => ({
    fieldId,
    value,
    sourceDocument,
    sourceDate,
  }));
  return [...scalar, ...flattenGroups(values.groups, sourceDocument, sourceDate)];
}

/**
 * Gate names the registry itself says must be approved before this
 * document may be authored — read from `pathways.json`'s
 * `gates[...].unlocks`, never hardcoded here.
 */
export function documentGatesFor(documentId: string): string[] {
  return Object.entries(registry.pathways.gates)
    .filter(([, gate]) => (gate.unlocks ?? []).includes(documentId))
    .map(([name]) => name);
}

/**
 * Gates this document itself sets (registry `gates[...].setBy`). A
 * document is never gated on a gate it is the one to set: document 04
 * sets `fba.approved` at 04.9, so telling the practitioner they must
 * approve the FBA before they may author the FBA would be circular.
 */
export function gatesSetHere(documentId: string): string[] {
  return Object.entries(registry.pathways.gates)
    .filter(([, gate]) => (gate.setBy ?? "").split(".")[0] === documentId)
    .map(([name]) => name);
}

export interface GateCheckInput {
  documentId: string;
  instanceId: string;
  pathway: Pathway;
  approvedGates: ReadonlySet<string>;
  caps?: Capabilities;
}

function gateContext(input: GateCheckInput) {
  return {
    documentId: input.documentId,
    pathway: input.pathway,
    approvedGates: input.approvedGates,
    targetDocument: toTargetDocument(input.documentId, input.instanceId),
    documentGates: documentGatesFor(input.documentId),
  };
}

/** Authoring-time gate check for any document, registry-driven. Gates the
 * document itself sets are excluded — see `gatesSetHere`. */
export function authoringGates(input: GateCheckInput): GateViolation[] {
  const setHere = new Set(gatesSetHere(input.documentId));
  return checkAuthoringGates(gateContext(input), input.caps ?? CAPABILITIES.standalone).filter(
    (v) => !setHere.has(v.gate),
  );
}

/** Release-time gate check, including the interim-safeguard disposition
 * check the registry applies to document 09. */
export function releaseGates(
  input: GateCheckInput,
  interimSafeguards: InterimSafeguard[] = [],
): GateViolation[] {
  const setHere = new Set(gatesSetHere(input.documentId));
  return checkReleaseGates(
    gateContext(input),
    input.caps ?? CAPABILITIES.standalone,
    interimSafeguards,
  ).filter((v) => !setHere.has(v.gate));
}

/** One line per distinct gate, so a document gated for two reasons on the
 * same gate doesn't shout twice at the practitioner. */
export function dedupeViolations(violations: GateViolation[]): GateViolation[] {
  const seen = new Set<string>();
  const out: GateViolation[] = [];
  for (const v of violations) {
    const key = `${v.gate}::${v.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Which documents are reachable under an RRP classification's own
 * permissions (registry `pathways.json` `states`). `blocks` is distinct
 * from `forbids`: blocked documents become reachable once classification
 * resolves, forbidden ones never do for this classification.
 */
export type DocumentReachability = "permitted" | "blocked" | "forbidden";

export function reachability(
  documentId: string,
  permissions: { permits: readonly string[]; forbids: readonly string[]; blocks: readonly string[] },
): DocumentReachability {
  if (permissions.forbids.includes(documentId)) return "forbidden";
  if (permissions.blocks.includes(documentId)) return "blocked";
  if (permissions.permits.includes(documentId)) return "permitted";
  // Not named at all by this classification: withheld rather than
  // silently allowed. Nothing is reachable by default.
  return "blocked";
}

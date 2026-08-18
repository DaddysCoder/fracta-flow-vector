import type { ResolvedPathway } from "@pbs/core";
import { registry } from "@pbs/registry";
import { reachability, type DocumentReachability } from "./documentForm.js";

/**
 * The workflow's fixed document order: Referral → Triage → Sources →
 * Assessment → Behaviour capture → Strategies → the plan for this
 * pathway → release. Which of these are actually reachable is decided by
 * the RRP classification's own permits/forbids/blocks in
 * `pathways.json`, never by a flat three-way switch in code.
 */
export const DOCUMENT_ORDER = ["01", "02", "03", "04", "05", "06", "07", "08", "09"] as const;

export interface DocumentStep {
  id: string;
  title: string;
  reachability: DocumentReachability;
  /** Why it is not reachable, in the registry's own words. */
  note?: string;
}

/**
 * The whole flow as the practitioner sees it, for one resolved pathway.
 * Documents 01-03 are reachable under every classification (all three
 * `states` permit them); everything after that follows the registry.
 */
export function documentSteps(resolved: ResolvedPathway): DocumentStep[] {
  return DOCUMENT_ORDER.map((id) => {
    const doc = registry.documents[id];
    const state = reachability(id, resolved);
    return {
      id,
      title: doc ? doc.title : id,
      reachability: state,
      note:
        state === "forbidden"
          ? "Not part of this pathway."
          : state === "blocked"
            ? "Withheld until the RRP classification is resolved."
            : undefined,
    };
  });
}

/** Documents the practitioner can actually open right now. */
export function reachableDocumentIds(resolved: ResolvedPathway): string[] {
  return documentSteps(resolved)
    .filter((step) => step.reachability === "permitted")
    .map((step) => step.id);
}

/**
 * The plan document for a resolved pathway — whichever of 07/08/09 the
 * classification permits. Returns null before a classification exists.
 */
export function planDocumentId(resolved: ResolvedPathway): string | null {
  const reachable = reachableDocumentIds(resolved);
  return ["07", "08", "09"].find((id) => reachable.includes(id)) ?? null;
}

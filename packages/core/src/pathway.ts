import type { Pathway } from "./gates.js";

/**
 * The practitioner's RRP classification, authored at 02.E (registry field
 * `triage.rrp_status`). Practitioner-authored only — no keyword or
 * checkbox may set this.
 */
export type RrpClassification = "none" | "possible_unclear" | "confirmed";

/**
 * Registry-shaped document permissions for one RRP classification (see
 * `@pbs/registry` `pathways.json` `states`). `@pbs/core` never imports
 * `@pbs/registry` — callers adapt the real registry data into this shape,
 * same pattern as `FieldSchema`/`TargetDocument` in resolve().
 */
export interface PathwayPermissions {
  /** Document ids currently open for authoring under this classification. */
  permits: readonly string[];
  /** Document ids permanently disallowed under this classification. */
  forbids: readonly string[];
  /** Document ids temporarily withheld pending classification review —
   * distinct from `forbids`: these become permitted once the RRP
   * classification resolves to something else. */
  blocks?: readonly string[];
}

export interface ResolvedPathway {
  /** The pathway used for Tier-3/FBA/Strategy-Instance gating (gates.ts). */
  pathway: Pathway;
  permits: readonly string[];
  forbids: readonly string[];
  blocks: readonly string[];
}

/**
 * Resolves the practitioner's RRP classification into the pathway used for
 * gating plus the document permissions for that classification.
 *
 * `possible_unclear` resolves to "interim", not "no_rp": a case under
 * classification review is gated as cautiously as a confirmed RRP case
 * while investigation continues, never as a no-RP case. (Direction from
 * Pol, 2026-08-17 — possible/unclear RRP is treated as in-RP-and-under-
 * investigation.) This is consistent with the registry's own permissions
 * for `possible_unclear`, which already blocks Strategy Instance
 * authoring (06) and the no-RP BSP (07) pending resolution.
 *
 * `confirmed` also resolves to "interim" until the FBA conclusion is
 * approved (`fba.approved`), then resolves to "comprehensive" — a
 * confirmed case authors Interim safeguards immediately, in parallel with
 * the ongoing FBA, and only gains Comprehensive-plan gating once that FBA
 * is approved.
 */
export function resolvePathway(
  classification: RrpClassification,
  permissions: PathwayPermissions,
  approvedGates: ReadonlySet<string>,
): ResolvedPathway {
  const pathway: Pathway =
    classification === "none"
      ? "no_rp"
      : classification === "confirmed" && approvedGates.has("fba.approved")
        ? "comprehensive"
        : "interim";

  return {
    pathway,
    permits: permissions.permits,
    forbids: permissions.forbids,
    blocks: permissions.blocks ?? [],
  };
}

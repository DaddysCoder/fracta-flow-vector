import { registry } from "@pbs/registry";
import type { VisibilityRule } from "./visibility.js";

export const ASSESSMENT_DOCUMENT_ID = "04";

/**
 * Document 04 is the **Assessment / FBA Record**, not a second FBA
 * engine. Frame owns behaviour assessment, ABC data, formulation,
 * hypothesis generation and FBA analysis; Vector receives Frame's
 * `FbaOutcomeBundle`, shows what it contains, lets the practitioner
 * reconcile it into the record, and gates everything downstream on the
 * practitioner's own approval at 04.9.
 *
 * These are the sections whose content originates in Frame. Fields asked
 * in them are still practitioner-editable — a reconciliation the
 * practitioner cannot correct would be worse than no reconciliation —
 * but the form shows Frame's proposed content beside them and nothing is
 * ever copied in without an explicit click. See CONTRADICTIONS.md #6.
 */
export const FRAME_RECONCILED_SECTION_IDS: readonly string[] = ["04.4", "04.5", "04.6", "04.7", "04.8"];

/** Sections Vector authors on its own account: participant context,
 * settings, handoff provenance, the practitioner's own conclusion. */
export const VECTOR_AUTHORED_SECTION_IDS: readonly string[] = ["04.1", "04.2", "04.3", "04.9", "04.10"];

/** No conditional branches: every section of 04 is always in scope. What
 * varies is whether a Frame bundle has been received, which is a display
 * concern (see AssessmentForm), not a visibility rule over fields. */
export const ASSESSMENT_VISIBILITY_RULES: VisibilityRule[] = [];

/**
 * The practitioner's conclusion is what `fba.approved` is approval *of*
 * (registry: `analysis.conclusion`, "Hard clinical gate. Approval here
 * sets fba.approved."). It, and the two findings it rests on, must be
 * present before the approval action is offered — approving an empty
 * conclusion would set a gate that unlocks 06/07/09 on nothing.
 */
export const FBA_APPROVAL_REQUIRED_FIELD_IDS = [
  "analysis.function",
  "analysis.maintaining_variables",
  "analysis.conclusion",
];

/** Nothing is hard-required to *save* the record — an assessment in
 * progress is a legitimate state. Approval is what has requirements. */
export const ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS: string[] = [];

/** The gate this document sets, and the documents it unlocks — read from
 * the registry rather than restated here. */
export const FBA_GATE = "fba.approved";

export function fbaGateUnlocks(): string[] {
  return registry.pathways.gates[FBA_GATE]?.unlocks ?? [];
}

/** True once every field the approval rests on carries a value. */
export function canApproveFba(values: Record<string, unknown>): boolean {
  return FBA_APPROVAL_REQUIRED_FIELD_IDS.every((id) => {
    const v = values[id];
    return v !== undefined && v !== null && v !== "";
  });
}

/** Field ids still empty that block approval — shown to the practitioner
 * so "why can't I approve" is always answerable. */
export function fbaApprovalBlockers(values: Record<string, unknown>): string[] {
  return FBA_APPROVAL_REQUIRED_FIELD_IDS.filter((id) => {
    const v = values[id];
    return v === undefined || v === null || v === "";
  });
}

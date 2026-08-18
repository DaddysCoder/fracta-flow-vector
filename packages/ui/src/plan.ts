import type { InterimSafeguard, SafeguardDisposition } from "@pbs/core";
import { registry, type FieldDef } from "@pbs/registry";
import type { RepeatableRow } from "./fields/RepeatableGroup.js";
import { documentFields, quotedFields } from "./documentForm.js";
import type { VisibilityRule } from "./visibility.js";

export const STRATEGY_DOCUMENT_ID = "06";
export const NO_RP_BSP_DOCUMENT_ID = "07";
export const INTERIM_BSP_DOCUMENT_ID = "08";
export const COMPREHENSIVE_BSP_DOCUMENT_ID = "09";

export const PLAN_VISIBILITY_RULES: VisibilityRule[] = [];
export const PLAN_ALWAYS_REQUIRED_FIELD_IDS: string[] = [];

/**
 * Field groups that carry regulated-restrictive-practice content. MD-012:
 * a No-RP plan contains no RRP scaffolding at all — not empty RRP
 * sections, not "N/A" rows. Enforced structurally by the registry
 * (`validate.mjs`'s `no-rp-clean` rule and each field's `pathways` list)
 * and asserted from the UI side in `test/noRpBsp.test.ts`.
 */
export const RRP_FIELD_GROUPS: readonly string[] = ["rrp", "interim_safeguard"];

export function isRrpField(field: FieldDef): boolean {
  return (
    RRP_FIELD_GROUPS.includes(field.group ?? "") ||
    field.id.startsWith("rrp.") ||
    field.id.startsWith("interim.")
  );
}

/** Every field the No-RP BSP renders: the ones it asks (none, today) plus
 * everything quoted into it. This is what a zero-RRP assertion has to
 * cover — quoting is how content actually reaches document 07. */
export function noRpBspRenderedFields(): FieldDef[] {
  return [...documentFields(NO_RP_BSP_DOCUMENT_ID), ...quotedFields(NO_RP_BSP_DOCUMENT_ID)];
}

/** The Strategy Library pin on one Strategy Instance row. Empty until the
 * practitioner records it; never auto-filled from a library, because a
 * library update must not reach an existing instance. */
export interface StrategyPinView {
  rowId: string;
  libraryId: string | null;
  libraryVersion: string | null;
}

export function strategyPins(rows: RepeatableRow[]): StrategyPinView[] {
  return rows.map((row) => ({
    rowId: row.rowId,
    libraryId: (row.values["strategy.library_id"] as string) ?? null,
    libraryVersion: (row.values["strategy.library_version"] as string) ?? null,
  }));
}

export const SAFEGUARD_GROUP = "interim_safeguard";

export const SAFEGUARD_DISPOSITIONS: readonly SafeguardDisposition[] = [
  "replace",
  "retain_with_new_justification",
  "revise",
  "retire",
];

export const SAFEGUARD_DISPOSITION_LABELS: Record<SafeguardDisposition, string> = {
  replace: "Replace with an assessed strategy",
  retain_with_new_justification: "Retain, with new justification",
  revise: "Revise",
  retire: "Retire",
};

/**
 * Builds the governance view of the Interim BSP's temporary safeguards.
 *
 * `unassessed` is always true and is never a practitioner choice: an
 * interim safeguard is by definition put in place before the assessment
 * concludes. `disposition` has no default — `null` means undecided, and
 * `checkReleaseGates` blocks a Comprehensive release while any is null.
 *
 * Disposition is deliberately not a registry field: it is case governance
 * attached to a safeguard row, decided when the Comprehensive plan
 * reviews it, and modelling it as a field asked in 09.13 would split the
 * `interim_safeguard` group across two documents and break row identity.
 * See CONTRADICTIONS.md #7.
 */
export function safeguardsFromRows(
  rows: RepeatableRow[],
  dispositions: Record<string, SafeguardDisposition | null> = {},
): InterimSafeguard[] {
  return rows.map((row) => ({
    id: row.rowId,
    unassessed: true,
    disposition: dispositions[row.rowId] ?? null,
  }));
}

export function undisposedSafeguards(safeguards: InterimSafeguard[]): InterimSafeguard[] {
  return safeguards.filter((s) => s.disposition === null);
}

/** Human label for a safeguard row, taken from its rationale text so the
 * disposition list is readable rather than a list of row ids. */
export function safeguardLabel(row: RepeatableRow): string {
  const text = row.values["interim.safeguard_rationale"];
  const asText = typeof text === "string" ? text.trim() : "";
  return asText === "" ? `Safeguard ${row.rowId.slice(0, 8)}` : asText.slice(0, 80);
}

/** Documents whose release the registry blocks on a named gate. */
export function releaseBlockedBy(documentId: string): string[] {
  return Object.entries(registry.pathways.gates)
    .filter(([, gate]) => (gate.blocksReleaseOf ?? []).includes(documentId))
    .map(([name]) => name);
}

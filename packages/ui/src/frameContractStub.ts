/**
 * ⚠️ LOCAL STUB — NOT THE REAL CONTRACT PACKAGE ⚠️
 *
 * Vector and Frame exchange data only through the shared `@fracta/contract`
 * package, as a normal dependency. Neither repo ever imports the other's
 * source.
 *
 * As of 2026-08-18 `@fracta/contract` is **not available**: it is absent
 * from this repo's `package.json` files and `pnpm-lock.yaml`, and
 * `npm view @fracta/contract` returns 404 on the public registry. This
 * file therefore declares the shape Vector expects to receive, so the
 * Document 04 reconciliation UI can be built and tested against
 * something concrete — it is **not** a working integration and nothing
 * here talks to Frame.
 *
 * When `@fracta/contract` ships:
 *   1. add it as a dependency of `@pbs/ui`,
 *   2. replace the type declarations below with
 *      `import type { ParticipantContext, FbaOutcomeBundle } from "@fracta/contract";`,
 *   3. keep the functions below (they are Vector-side logic, not contract
 *      surface) and fix up any field-name drift the real package brings.
 *
 * The types below are deliberately thin. They carry only what Vector can
 * honestly say it holds or expects — participant context assembled from
 * this case's own registry values, and findings addressed to specific
 * Vector registry field ids. No clinical structure is invented here: a
 * finding says "Frame proposes this text for this Vector field", and a
 * practitioner decides whether it enters the record.
 */

import type { FieldEntry } from "@pbs/core";
import { registry } from "@pbs/registry";
import type { FormValues } from "./FormRenderer.js";
import { FRAME_RECONCILED_SECTION_IDS } from "./assessment.js";

/** Vector → Frame. Context Frame needs to run an assessment, drawn from
 * values Vector already holds. Never includes interpretation: Vector does
 * not do FBA analysis, so it has nothing interpretive to send. */
export interface ParticipantContext {
  /** Vector's case/document-instance reference, not a participant identifier. */
  caseRef: string;
  /** Pathway currently resolved for this case ("no_rp" | "interim" | "comprehensive"). */
  pathway: string;
  /** ISO 8601, caller-supplied. */
  preparedAt: string;
  /** Tier 0-2 registry values assembled from this case, keyed by registry
   * field id. Tier 3 (interpretation) is deliberately excluded. */
  values: Record<string, unknown>;
}

/** One thing Frame concluded, addressed to a Vector registry field. */
export interface FbaFinding {
  /** Stable id within the bundle. */
  id: string;
  /** Registry field id this finding is proposed for, e.g. "behaviour.definition". */
  targetFieldId: string;
  /** For repeatable fields: which proposed row this belongs to. Findings
   * sharing a rowKey are accepted into the same row. */
  rowKey?: string;
  /** The text Frame proposes. Never written to the record automatically. */
  value: string;
  /** Frame's own note on where this came from. Display only. */
  provenance?: string;
}

/** Frame → Vector. */
export interface FbaOutcomeBundle {
  bundleId: string;
  /** Echoes the `caseRef` of the ParticipantContext this answers. */
  caseRef: string;
  /** ISO 8601. */
  generatedAt: string;
  findings: FbaFinding[];
}

/**
 * Registry field ids a bundle finding is allowed to target: only fields
 * asked in Document 04's reconciled sections. A bundle can never reach
 * into triage, the source register, or a plan document — if Frame sends
 * a finding for anything else it is surfaced as rejected, not applied.
 */
export const RECONCILABLE_FIELD_IDS: ReadonlySet<string> = new Set(
  registry.fields
    .filter((f) => FRAME_RECONCILED_SECTION_IDS.includes(f.askedIn))
    .map((f) => f.id),
);

export type ReconciliationStatus =
  /** Nothing recorded locally for this field yet — the finding is offered, not applied. */
  | "offered"
  /** The practitioner accepted the finding and has not changed the text since. */
  | "accepted_unchanged"
  /** A local value exists and differs from what Frame proposed. */
  | "differs"
  /** Frame addressed a field Document 04 does not reconcile. Never applicable. */
  | "out_of_scope";

export interface ReconciliationItem {
  finding: FbaFinding;
  /** The value currently recorded in Vector for this field, if any. */
  localValue: unknown;
  status: ReconciliationStatus;
}

function localValueFor(values: FormValues, finding: FbaFinding): unknown {
  if (finding.rowKey !== undefined) {
    const rows = values.groups[groupOf(finding.targetFieldId) ?? ""] ?? [];
    const row = rows.find((r) => r.rowId === finding.rowKey);
    return row?.values[finding.targetFieldId];
  }
  return values.scalar[finding.targetFieldId];
}

function groupOf(fieldId: string): string | undefined {
  return registry.fields.find((f) => f.id === fieldId)?.group;
}

/**
 * Compares a received bundle against what Vector currently holds. Pure —
 * it reads state and reports, it never writes. Applying a finding is
 * always a separate, explicit practitioner action (`acceptFinding`).
 */
export function reconcileBundle(bundle: FbaOutcomeBundle, values: FormValues): ReconciliationItem[] {
  return bundle.findings.map((finding) => {
    if (!RECONCILABLE_FIELD_IDS.has(finding.targetFieldId)) {
      return { finding, localValue: undefined, status: "out_of_scope" as const };
    }
    const localValue = localValueFor(values, finding);
    if (localValue === undefined || localValue === null || localValue === "") {
      return { finding, localValue, status: "offered" as const };
    }
    return {
      finding,
      localValue,
      status: localValue === finding.value ? ("accepted_unchanged" as const) : ("differs" as const),
    };
  });
}

/**
 * Copies one finding's text into the form's values — the explicit,
 * visible practitioner action. Returns new values; never mutates.
 * A finding targeting a field outside Document 04's reconciled sections
 * is refused outright and the values come back unchanged.
 */
export function acceptFinding(values: FormValues, finding: FbaFinding): FormValues {
  if (!RECONCILABLE_FIELD_IDS.has(finding.targetFieldId)) return values;

  if (finding.rowKey !== undefined) {
    const group = groupOf(finding.targetFieldId);
    if (!group) return values;
    const rows = values.groups[group] ?? [];
    const existing = rows.find((r) => r.rowId === finding.rowKey);
    const nextRows = existing
      ? rows.map((r) =>
          r.rowId === finding.rowKey
            ? { ...r, values: { ...r.values, [finding.targetFieldId]: finding.value } }
            : r,
        )
      : [...rows, { rowId: finding.rowKey, values: { [finding.targetFieldId]: finding.value } }];
    return { ...values, groups: { ...values.groups, [group]: nextRows } };
  }

  return { ...values, scalar: { ...values.scalar, [finding.targetFieldId]: finding.value } };
}

/**
 * Assembles the Vector → Frame half of the contract from the case's own
 * recorded values. Tier 3 is excluded: interpretation is Frame's output,
 * never Vector's input to it.
 */
export function buildParticipantContext(input: {
  caseRef: string;
  pathway: string;
  preparedAt: string;
  caseFields: FieldEntry[];
}): ParticipantContext {
  const tierOf = new Map(registry.fields.map((f) => [f.id, f.tier] as const));
  const values: Record<string, unknown> = {};
  for (const entry of input.caseFields) {
    const tier = tierOf.get(entry.fieldId);
    if (tier === undefined || tier === 3) continue;
    values[entry.fieldId] = entry.value;
  }
  return {
    caseRef: input.caseRef,
    pathway: input.pathway,
    preparedAt: input.preparedAt,
    values,
  };
}

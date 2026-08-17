import { registry } from "@pbs/registry";
import type { FieldEntry, FieldSchema, TargetDocument } from "../src/types.js";
import type { PathwayPermissions, RrpClassification } from "../src/pathway.js";

/**
 * Documents whose title marks them as the case's source/consultation
 * register. Fields asked within one of their sections are the case
 * register: every recorded row is always attached as tier3 evidence,
 * regardless of `informs` (see registry document "03: Source and
 * Consultation Register", field `source.entry`).
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

/** The complete field schema the case is authored against — resolve()
 * itself decides what's in scope for a given document, so this is
 * intentionally NOT pre-filtered per document. */
export const ALL_FIELDS: FieldSchema[] = registry.fields.map((f) => toFieldSchema(f.id));

export function toTargetDocument(documentId: string, instanceId: string): TargetDocument {
  const doc = registry.documents[documentId];
  if (!doc) throw new Error(`Unknown registry document "${documentId}"`);
  return {
    id: instanceId,
    sections: doc.sections.map((s) => s.id),
    fields: ALL_FIELDS,
  };
}

export function toPathwayPermissions(classification: RrpClassification): PathwayPermissions {
  const state = registry.pathways.states[classification];
  if (!state) throw new Error(`Unknown RRP classification "${classification}"`);
  return { permits: state.permits, forbids: state.forbids, blocks: state.blocks };
}

export const BSA_2025 = "bsa-2025"; // an earlier Combined BSA/FBA cycle
export const BSA_2026 = toTargetDocument("04", "bsa-2026"); // the BSA/FBA being resolved
export const REFERRAL_1 = "referral-1";
export const TRIAGE_1 = "triage-1";
export const BSP_2026 = toTargetDocument("07", "bsp-2026"); // the No-RP BSP being resolved

/**
 * A case with a referral, a practitioner triage, an earlier BSA/FBA
 * cycle, and the BSA/FBA now being re-run — enough to exercise every
 * tier against the real registry:
 *
 *  - participant.preferred_name (tier0): from referral-1, flows into
 *    bsa-2026 untouched (identity is never re-confirmed).
 *  - health.record (tier1): recorded during the earlier bsa-2025 cycle;
 *    resurfaces in bsa-2026 as a batched-confirm candidate, staleness
 *    depending on `now`.
 *  - behaviour.definition (tier2, repeatable, group "behaviour"): row
 *    beh-1 was already re-entered directly into bsa-2026 (local — wins
 *    over the older bsa-2025 copy); row beh-2 only exists on bsa-2025
 *    (a carry-forward candidate).
 *  - analysis.conclusion (tier3, askedIn 04.9): always blank in
 *    bsa-2026 regardless of any prior value, evidenced by the
 *    risk.matrix_* rows (which `inform` 04.9) and by every row of the
 *    case's source register (source.entry), unconditionally.
 *  - goals / risk.assessed (tier3, but only *rendered* — not asked — in
 *    the No-RP BSP): already finalized on bsa-2026, so they flow into
 *    bsp-2026 as ordinary renders (tier0), not blank.
 *  - accommodation (tier1): from referral-1, resurfaces in bsp-2026.
 *  - source.entry (tier2, repeatable, the case register): carried
 *    forward into bsp-2026's own Sources section.
 */
export function buildFields(): FieldEntry[] {
  return [
    {
      fieldId: "participant.preferred_name",
      value: "Sam",
      sourceDocument: REFERRAL_1,
      sourceDate: "2025-01-10",
    },
    {
      fieldId: "health.record",
      value: "No known allergies; asthma, reliever as needed.",
      sourceDocument: BSA_2025,
      sourceDate: "2025-02-01",
    },
    {
      fieldId: "behaviour.definition",
      rowId: "beh-1",
      value: { label: "Exit-seeking", description: "Attempts to leave the property unsupervised." },
      sourceDocument: BSA_2025,
      sourceDate: "2025-02-01",
    },
    {
      fieldId: "behaviour.definition",
      rowId: "beh-1",
      value: {
        label: "Exit-seeking",
        description: "Attempts to leave the property unsupervised, most often after 4pm.",
      },
      sourceDocument: BSA_2026.id,
      sourceDate: "2026-07-01",
    },
    {
      fieldId: "behaviour.definition",
      rowId: "beh-2",
      value: { label: "Property damage", description: "Throws objects when routine is disrupted." },
      sourceDocument: BSA_2025,
      sourceDate: "2025-02-01",
    },
    {
      fieldId: "risk.matrix_likelihood",
      rowId: "risk-1",
      value: 4,
      sourceDocument: TRIAGE_1,
      sourceDate: "2026-06-05",
    },
    {
      fieldId: "risk.matrix_consequence",
      rowId: "risk-1",
      value: 3,
      sourceDocument: TRIAGE_1,
      sourceDate: "2026-06-05",
    },
    {
      fieldId: "risk.matrix_rating",
      rowId: "risk-1",
      value: 12,
      sourceDocument: TRIAGE_1,
      sourceDate: "2026-06-05",
    },
    {
      fieldId: "source.entry",
      rowId: "src-1",
      value: { who: "GP", note: "Reviewed GP letter dated 2026-05-20." },
      sourceDocument: "source-register-1",
      sourceDate: "2026-06-01",
    },
    {
      fieldId: "source.entry",
      rowId: "src-2",
      value: { who: "Support worker", note: "Interview conducted 2026-06-02." },
      sourceDocument: "source-register-1",
      sourceDate: "2026-06-02",
    },
    {
      fieldId: "goals",
      value: "Reduce exit-seeking; increase functional communication for routine changes.",
      sourceDocument: BSA_2026.id,
      sourceDate: "2026-07-15",
    },
    {
      fieldId: "risk.assessed",
      value: "Moderate risk of harm from unsupervised exit; see risk matrix.",
      sourceDocument: BSA_2026.id,
      sourceDate: "2026-07-15",
    },
    {
      fieldId: "accommodation",
      value: "Shared supported independent living, 3 co-residents.",
      sourceDocument: REFERRAL_1,
      sourceDate: "2025-01-10",
    },
  ];
}

export function buildRecord() {
  return { fields: buildFields() };
}

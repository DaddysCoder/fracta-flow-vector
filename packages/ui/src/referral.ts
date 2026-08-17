import type { VisibilityRule } from "./visibility.js";

export const REFERRAL_DOCUMENT_ID = "01";

/**
 * Conditional logic for the Referral form. Every rule here is the one
 * described in the spec — nothing implicit, nothing inferred from field
 * naming conventions.
 */
export const REFERRAL_VISIBILITY_RULES: VisibilityRule[] = [
  {
    id: "referrer-not-participant",
    targetFieldIds: ["referrer.relationship_to_participant", "referrer.awareness_of_referral"],
    when: (v) => v["referrer.is_participant"] === "no",
  },
  {
    id: "guardian-identified",
    targetFieldIds: ["guardian.contact"],
    when: (v) => Boolean(v["guardian.name_role"]),
  },
  {
    id: "existing-bsp-yes",
    targetFieldIds: ["existing.plan_type", "existing.plan_date", "existing.practitioner", "existing.request_document"],
    when: (v) => v["existing.bsp"] === "yes",
  },
  {
    id: "urgent-yes",
    targetFieldIds: ["referral.urgent_explanation"],
    when: (v) => v["referral.urgent"] === "yes",
    required: true,
  },
];

/**
 * Core identity/reason fields required regardless of any conditional
 * branch. Deliberately excludes referral.funding_status — funding
 * uncertainty must never block submission.
 */
export const REFERRAL_ALWAYS_REQUIRED_FIELD_IDS = [
  "participant.preferred_name",
  "participant.legal_name",
  "participant.dob",
  "participant.ndis_number",
  "referrer.identity",
  "referral.date",
  "referral.source",
  "referral.reason",
];

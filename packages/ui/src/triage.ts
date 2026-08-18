import type { VisibilityRule } from "./visibility.js";

export const TRIAGE_DOCUMENT_ID = "02";

/**
 * Conditional logic for the Practitioner Triage form.
 *
 * `health.triage_screen`'s own registry note says it should show "when
 * RRP is identified or immediate danger is flagged" — but there is no
 * separate "immediate danger" field anywhere in the registry to condition
 * on (only `triage.rrp_status` and the derived, display-only risk
 * rating, which MD-019 forbids using to gate anything). So this rule can
 * only implement the RRP half of that note; flagged in CONTRADICTIONS.md
 * rather than inventing a field.
 *
 * `rrp.circumstances`/`rrp.procedure` are restricted to the interim and
 * comprehensive pathways in the registry itself (`pathways` excludes
 * `no_rp`), which in practice means: not when RRP is "none".
 */
export const TRIAGE_VISIBILITY_RULES: VisibilityRule[] = [
  {
    id: "health-screen-when-rrp-identified",
    targetFieldIds: ["health.triage_screen"],
    when: (v) => v["triage.rrp_status"] === "possible_unclear" || v["triage.rrp_status"] === "confirmed",
    required: true,
  },
  {
    id: "rrp-fields-when-rrp-identified",
    targetFieldIds: ["rrp.circumstances", "rrp.procedure"],
    when: (v) => v["triage.rrp_status"] === "possible_unclear" || v["triage.rrp_status"] === "confirmed",
  },
];

/** Fields required regardless of any conditional branch — the minimum a
 * practitioner triage decision needs to stand on. */
export const TRIAGE_ALWAYS_REQUIRED_FIELD_IDS = [
  "practitioner.identity",
  "response.current_actions",
  "safety.current_arrangements",
  "triage.rrp_status",
  "triage.outcome",
];

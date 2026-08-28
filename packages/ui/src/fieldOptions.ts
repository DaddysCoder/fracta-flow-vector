/**
 * Option lists for select/multiselect fields. The registry's FieldDef
 * doesn't carry presentation copy (it's schema, not UI text), so this is
 * the one piece of per-field data the shell needs beyond the registry —
 * still data, not markup, and the FormRenderer consults it generically.
 */
export interface FieldOption {
  value: string;
  label: string;
}

export const FIELD_OPTIONS: Record<string, FieldOption[]> = {
  "referrer.is_participant": [
    { value: "yes", label: "Yes, the referrer is the participant" },
    { value: "no", label: "No, someone else is referring on the participant's behalf" },
  ],
  "referrer.awareness_of_referral": [
    { value: "yes", label: "Yes, the participant knows" },
    { value: "no", label: "No, the participant does not know" },
    { value: "unsure", label: "Unsure" },
  ],
  "referral.urgent": [
    { value: "yes", label: "Yes — flag for priority review" },
    { value: "no", label: "No" },
  ],
  "referral.funding_status": [
    { value: "confirmed", label: "Confirmed" },
    { value: "unknown", label: "Unknown — submit anyway, this never blocks triage" },
    { value: "not_applicable", label: "Not applicable" },
  ],
  "existing.bsp": [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
  "existing.plan_type": [
    { value: "no_rp", label: "No-RP BSP" },
    { value: "interim", label: "Interim RRP BSP" },
    { value: "comprehensive", label: "Comprehensive RRP BSP" },
    { value: "unknown", label: "Not sure" },
  ],
  "triage.rrp_status": [
    { value: "none", label: "None identified" },
    { value: "possible_unclear", label: "Possible or unclear — needs classification review" },
    { value: "confirmed", label: "Confirmed" },
  ],
  "triage.outcome": [
    { value: "accept", label: "Accept" },
    { value: "request_information", label: "Request more information" },
    { value: "waitlist", label: "Waitlist" },
    { value: "decline", label: "Decline" },
  ],
  "risk.matrix_likelihood": [
    { value: "1", label: "1 — Rare" },
    { value: "2", label: "2 — Unlikely" },
    { value: "3", label: "3 — Possible" },
    { value: "4", label: "4 — Likely" },
    { value: "5", label: "5 — Almost certain" },
  ],
  "risk.matrix_consequence": [
    { value: "1", label: "1 — Insignificant" },
    { value: "2", label: "2 — Minor" },
    { value: "3", label: "3 — Moderate" },
    { value: "4", label: "4 — Major" },
    { value: "5", label: "5 — Severe" },
  ],
  "rrpassess.practice_types": [
    { value: "seclusion", label: "Seclusion" },
    { value: "chemical", label: "Chemical restraint" },
    { value: "mechanical", label: "Mechanical restraint" },
    { value: "physical", label: "Physical restraint" },
    { value: "environmental", label: "Environmental restraint" },
  ],
  "rrpassess.chemical.frequency": [
    { value: "prn", label: "PRN" },
    { value: "routine", label: "Routine" },
  ],
  "rrpassess.chemical.route": [
    { value: "oral", label: "Oral" },
    { value: "other", label: "Other" },
  ],
  "letter.behaviours_what": [
    { value: "property_damage", label: "Property damage" },
    { value: "verbal_aggression", label: "Verbal aggression" },
    { value: "physical_aggression", label: "Physical aggression" },
    { value: "self_injurious", label: "Self-injurious behaviour" },
    { value: "absconding", label: "Absconding" },
    { value: "other", label: "Other" },
  ],
  "letter.behaviours_frequency": [
    { value: "daily", label: "Daily" },
    { value: "several_weekly", label: "Several times a week" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "occasional", label: "Occasional" },
  ],
  "source_document.type": [
    { value: "report", label: "Report" },
    { value: "referral", label: "Referral" },
    { value: "assessment", label: "Assessment" },
    { value: "interview", label: "Interview" },
    { value: "observation", label: "Observation" },
    { value: "case_note", label: "Case note" },
    { value: "email", label: "Email" },
    { value: "letter", label: "Letter" },
    { value: "data", label: "Data" },
    { value: "other", label: "Other" },
  ],
  "progress.strategy_trialled.disposition": [
    { value: "continue", label: "Continue" },
    { value: "adjust", label: "Adjust" },
    { value: "discontinue", label: "Discontinue" },
  ],
};

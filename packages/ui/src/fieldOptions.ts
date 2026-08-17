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
};

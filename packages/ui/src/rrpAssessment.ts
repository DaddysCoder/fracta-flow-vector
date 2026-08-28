import type { VisibilityRule } from "./visibility.js";

export const RRP_ASSESSMENT_DOCUMENT_ID = "10";

const hasType = (type: string) => (v: Record<string, unknown>) =>
  ((v["rrpassess.practice_types"] as string[] | undefined) ?? []).includes(type);

/**
 * Which of the five per-practice-type sections (10.2-10.6) is relevant
 * depends entirely on the practitioner's own selection in 10.1
 * (`rrpassess.practice_types`) — never inferred. FormRenderer still
 * renders each section's heading even when every field inside is hidden
 * (same pre-existing behaviour TriageForm's 02.E already has for its own
 * conditional RRP fields), so an unselected practice type shows an empty
 * card rather than disappearing outright.
 */
export const RRP_ASSESSMENT_VISIBILITY_RULES: VisibilityRule[] = [
  {
    id: "seclusion-fields-when-selected",
    targetFieldIds: [
      "rrpassess.seclusion.what_happens",
      "rrpassess.seclusion.since",
      "rrpassess.seclusion.evidence",
      "rrpassess.seclusion.rationale",
      "rrpassess.seclusion.least_restrictive_analysis",
      "rrpassess.seclusion.reduction_plan",
      "rrpassess.seclusion.duration_review",
    ],
    when: hasType("seclusion"),
    required: true,
  },
  {
    id: "chemical-fields-when-selected",
    targetFieldIds: [
      "rrpassess.chemical.what_happens",
      "rrpassess.chemical.since",
      "rrpassess.chemical.evidence",
      "rrpassess.chemical.rationale",
      "rrpassess.chemical.least_restrictive_analysis",
      "rrpassess.chemical.reduction_plan",
      "rrpassess.chemical.duration_review",
      "rrpassess.chemical.medication_name",
      "rrpassess.chemical.dose",
      "rrpassess.chemical.side_effects",
      "rrpassess.chemical.frequency",
      "rrpassess.chemical.route",
    ],
    when: hasType("chemical"),
    required: true,
  },
  {
    id: "mechanical-fields-when-selected",
    targetFieldIds: [
      "rrpassess.mechanical.what_happens",
      "rrpassess.mechanical.since",
      "rrpassess.mechanical.evidence",
      "rrpassess.mechanical.rationale",
      "rrpassess.mechanical.least_restrictive_analysis",
      "rrpassess.mechanical.reduction_plan",
      "rrpassess.mechanical.duration_review",
    ],
    when: hasType("mechanical"),
    required: true,
  },
  {
    id: "physical-fields-when-selected",
    targetFieldIds: [
      "rrpassess.physical.what_happens",
      "rrpassess.physical.since",
      "rrpassess.physical.evidence",
      "rrpassess.physical.rationale",
      "rrpassess.physical.least_restrictive_analysis",
      "rrpassess.physical.reduction_plan",
      "rrpassess.physical.duration_review",
    ],
    when: hasType("physical"),
    required: true,
  },
  {
    id: "environmental-fields-when-selected",
    targetFieldIds: [
      "rrpassess.environmental.what_happens",
      "rrpassess.environmental.since",
      "rrpassess.environmental.evidence",
      "rrpassess.environmental.rationale",
      "rrpassess.environmental.least_restrictive_analysis",
      "rrpassess.environmental.reduction_plan",
      "rrpassess.environmental.duration_review",
    ],
    when: hasType("environmental"),
    required: true,
  },
];

export const RRP_ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS = ["rrpassess.practice_types"];

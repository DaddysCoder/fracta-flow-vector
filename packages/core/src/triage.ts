import type { FieldEntry } from "./types.js";

/**
 * "Urgent" only ever changes how soon a human looks at the referral —
 * `priority` is the only decision this function makes, and it is a
 * queueing decision, not a clinical one. Submission never determines
 * acceptance or a clinical pathway; that is a practitioner judgement
 * made later, during triage (document 02).
 */
export type TriagePriority = "standard" | "human_priority_review";

export interface TriageTask {
  id: string;
  referralDocumentId: string;
  createdAt: string;
  priority: TriagePriority;
  /** The referral's own answers, carried through for the triage practitioner. */
  fields: FieldEntry[];
}

export interface CreateTriageTaskInput {
  id: string;
  referralDocumentId: string;
  /** ISO 8601. Caller-supplied — this function never reads the system clock. */
  createdAt: string;
  urgent: boolean;
  fields: FieldEntry[];
}

export function createTriageTask(input: CreateTriageTaskInput): TriageTask {
  return {
    id: input.id,
    referralDocumentId: input.referralDocumentId,
    createdAt: input.createdAt,
    priority: input.urgent ? "human_priority_review" : "standard",
    fields: input.fields,
  };
}

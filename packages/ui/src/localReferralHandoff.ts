/** On-device referral snapshot for optional cross-form handoff within this browser. */
export const VECTOR_REFERRAL_STORAGE_KEY = "vectorReferralData";

const REFERRAL_HANDOFF_FIELDS: Record<string, string> = {
  "participant.name": "participantName",
  "participant.ndis_number": "ndisNumber",
  "participant.date_of_birth": "dateOfBirth",
  "participant.guardian": "guardian",
  "participant.accommodation": "accommodation",
  "referring.provider": "referringProvider",
};

export type VectorReferralHandoff = Record<string, string>;

export function saveReferralHandoff(scalarValues: Record<string, unknown>): void {
  const payload: VectorReferralHandoff = {};
  for (const [fieldId, storageKey] of Object.entries(REFERRAL_HANDOFF_FIELDS)) {
    const value = scalarValues[fieldId];
    if (typeof value === "string" && value.trim()) {
      payload[storageKey] = value.trim();
    }
  }
  if (Object.keys(payload).length === 0) {
    sessionStorage.removeItem(VECTOR_REFERRAL_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(VECTOR_REFERRAL_STORAGE_KEY, JSON.stringify(payload));
}

export function readReferralHandoff(): VectorReferralHandoff | null {
  try {
    const raw = sessionStorage.getItem(VECTOR_REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const result: VectorReferralHandoff = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) result[key] = value.trim();
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

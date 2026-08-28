import { readReferralHandoff } from "../localReferralHandoff.js";
import { loadTemplateState, STORAGE_KEYS } from "./storage.js";
import type { SupportTemplateState, TemplateBuildContext } from "./types.js";

const REFERRAL_MAP: Record<string, string[]> = {
  name: ["participantName"],
  ndis: ["ndisNumber"],
  dob: ["dateOfBirth"],
  personResponsible: ["guardian"],
  accommodation: ["accommodation"],
  provider: ["referringProvider"],
};

export function readReferralForTemplates(): Record<string, string> {
  const handoff = readReferralHandoff();
  if (!handoff) return {};
  const mapped: Record<string, string> = {};
  for (const [target, sources] of Object.entries(REFERRAL_MAP)) {
    for (const source of sources) {
      const value = handoff[source];
      if (value) {
        mapped[target] = value;
        break;
      }
    }
  }
  return mapped;
}

export function readInterimForTemplates(): SupportTemplateState | null {
  return loadTemplateState(STORAGE_KEYS.interim);
}

export function buildTemplateContext(): TemplateBuildContext {
  const interim = readInterimForTemplates();
  const hasInterim = Boolean(interim && Object.keys(interim.v).length > 0);
  return {
    referral: readReferralForTemplates(),
    interim,
    hasInterim,
  };
}

export function referralTag(fieldKey: string, referral: Record<string, string>): "FROM REFERRAL" | null {
  return referral[fieldKey] ? "FROM REFERRAL" : null;
}

export function interimTag(value: string | undefined): "FROM INTERIM" | null {
  return value ? "FROM INTERIM" : null;
}

export function referralDefault(fieldKey: string, referral: Record<string, string>): string {
  return referral[fieldKey] ?? "";
}

export type VectorPlan = "free" | "paid";

export type PaidFeature = "export" | "company_branding" | "support_templates";

export interface VectorEntitlements {
  plan: VectorPlan;
  exportDocuments: boolean;
  companyBranding: boolean;
  supportTemplates: boolean;
  documentCredits: number;
}

export const FREE_ENTITLEMENTS: VectorEntitlements = Object.freeze({
  plan: "free",
  exportDocuments: false,
  companyBranding: false,
  supportTemplates: false,
  documentCredits: 0,
});

export const PAID_ENTITLEMENTS: VectorEntitlements = Object.freeze({
  plan: "paid",
  exportDocuments: true,
  companyBranding: true,
  supportTemplates: true,
  documentCredits: 0,
});

export function entitlementsForPlan(plan: VectorPlan): VectorEntitlements {
  return plan === "paid" ? PAID_ENTITLEMENTS : FREE_ENTITLEMENTS;
}

export function canUseFeature(entitlements: VectorEntitlements, feature: PaidFeature): boolean {
  switch (feature) {
    case "export":
      return entitlements.exportDocuments;
    case "company_branding":
      return entitlements.companyBranding;
    case "support_templates":
      return entitlements.supportTemplates;
  }
}

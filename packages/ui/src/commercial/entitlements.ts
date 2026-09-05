export type VectorPlan = "free" | "paid";

export type PaidFeature =
  | "export"
  | "company_branding"
  | "support_templates"
  | "rrp_assessment"
  | "support_letter"
  | "progress_report"
  | "bsp_review_addendum";

export interface VectorEntitlements {
  plan: VectorPlan;
  exportDocuments: boolean;
  companyBranding: boolean;
  supportTemplates: boolean;
  /** Documents 10-13 (net-new, not part of the Support Templates hub) — the
   * README's entitlement table lists these as their own rows, distinct from
   * "Support Templates hub + BSP/Interim/Comprehensive wizards". */
  rrpAssessment: boolean;
  supportLetter: boolean;
  progressReport: boolean;
  bspReviewAddendum: boolean;
  documentCredits: number;
}

export const FREE_ENTITLEMENTS: VectorEntitlements = Object.freeze({
  plan: "free",
  exportDocuments: false,
  companyBranding: false,
  supportTemplates: false,
  rrpAssessment: false,
  supportLetter: false,
  progressReport: false,
  bspReviewAddendum: false,
  documentCredits: 0,
});

export const PAID_ENTITLEMENTS: VectorEntitlements = Object.freeze({
  plan: "paid",
  exportDocuments: true,
  companyBranding: true,
  supportTemplates: true,
  rrpAssessment: true,
  supportLetter: true,
  progressReport: true,
  bspReviewAddendum: true,
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
    case "rrp_assessment":
      return entitlements.rrpAssessment;
    case "support_letter":
      return entitlements.supportLetter;
    case "progress_report":
      return entitlements.progressReport;
    case "bsp_review_addendum":
      return entitlements.bspReviewAddendum;
  }
}

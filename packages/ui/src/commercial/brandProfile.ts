import { providerBrand, VECTOR_BRAND, type Brand } from "@pbs/export";
import { fetchVectorBrandProfile } from "./billing.js";
import { entitlementsForPlan, FREE_ENTITLEMENTS, type VectorEntitlements } from "./entitlements.js";

export interface BrandProfileInput {
  organisationName: string;
  accentHex?: string | null;
  inkHex?: string | null;
  paperHex?: string | null;
  contactLine?: string | null;
  footerText?: string | null;
}

function hexWithoutHash(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.replace(/^#/, "").slice(0, 6);
}

export function brandFromProfile(profile: BrandProfileInput): Brand {
  return providerBrand({
    name: profile.organisationName,
    accent: hexWithoutHash(profile.accentHex, VECTOR_BRAND.accent),
    ink: hexWithoutHash(profile.inkHex, VECTOR_BRAND.ink),
    paper: hexWithoutHash(profile.paperHex, VECTOR_BRAND.paper),
  });
}

export async function resolveExportBrand(entitlements: VectorEntitlements): Promise<Brand> {
  if (!entitlements.companyBranding) return VECTOR_BRAND;
  try {
    const profile = await fetchVectorBrandProfile();
    if (!profile?.organisationName) return VECTOR_BRAND;
    return brandFromProfile(profile);
  } catch {
    return VECTOR_BRAND;
  }
}

export function defaultEntitlements(): VectorEntitlements {
  return entitlementsForPlan("free");
}

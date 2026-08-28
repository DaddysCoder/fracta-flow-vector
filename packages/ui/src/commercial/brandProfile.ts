import { providerBrand, VECTOR_BRAND, type Brand } from "@pbs/export";
import { fetchVectorBrandProfile } from "./billing.js";
import { entitlementsForPlan, FREE_ENTITLEMENTS, type VectorEntitlements } from "./entitlements.js";

export const BRAND_ACCENT_SWATCHES = [
  { hex: "7B2FF7", label: "Vector purple" },
  { hex: "2B5F5F", label: "Teal" },
  { hex: "3A4F8F", label: "Indigo" },
  { hex: "0EA5A0", label: "Teal bright" },
  { hex: "D97757", label: "Terracotta" },
] as const;

export const BRAND_HEADING_FONTS = ["Montserrat", "Sora", "Space Grotesk", "Manrope", "DM Sans"] as const;
export type BrandHeadingFont = (typeof BRAND_HEADING_FONTS)[number];
export const DEFAULT_HEADING_FONT: BrandHeadingFont = "Montserrat";

export interface BrandProfileInput {
  organisationName: string;
  accentHex?: string | null;
  inkHex?: string | null;
  paperHex?: string | null;
  contactLine?: string | null;
  footerText?: string | null;
  /** Heading font applied app-wide and to every DOCX/print export. */
  headingFont?: BrandHeadingFont | null;
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
    headingFont: profile.headingFont ?? DEFAULT_HEADING_FONT,
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

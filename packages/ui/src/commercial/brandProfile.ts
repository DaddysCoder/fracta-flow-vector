import { providerBrand, VECTOR_BRAND, type Brand, type BrandLogo } from "@pbs/export/brand";
import { fetchVectorBrandLogo, fetchVectorBrandProfile } from "./billing.js";
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

export function brandFromProfile(profile: BrandProfileInput, logo?: BrandLogo): Brand {
  return providerBrand({
    name: profile.organisationName,
    accent: hexWithoutHash(profile.accentHex, VECTOR_BRAND.accent),
    ink: hexWithoutHash(profile.inkHex, VECTOR_BRAND.ink),
    paper: hexWithoutHash(profile.paperHex, VECTOR_BRAND.paper),
    headingFont: profile.headingFont ?? DEFAULT_HEADING_FONT,
    logo,
  });
}

const LOGO_CONTENT_TYPE_TO_DOCX_IMAGE_TYPE: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

/** Longest side a logo is scaled to for the letterhead — keeps a tall or
 * wide logo from dominating the document while preserving its aspect
 * ratio (docx's ImageRun takes an explicit width/height, no auto-fit). */
const MAX_LOGO_DISPLAY_SIZE = 72;

async function decodeBrandLogo(data: Uint8Array, contentType: string): Promise<BrandLogo | undefined> {
  const type = LOGO_CONTENT_TYPE_TO_DOCX_IMAGE_TYPE[contentType];
  if (!type) return undefined;
  try {
    const bitmap = await createImageBitmap(new Blob([data as BlobPart], { type: contentType }));
    const scale = Math.min(MAX_LOGO_DISPLAY_SIZE / bitmap.width, MAX_LOGO_DISPLAY_SIZE / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    bitmap.close();
    return { data, type, width, height };
  } catch {
    // A logo that fails to decode should never block export — fall back
    // to no logo rather than throwing away the rest of the branding.
    return undefined;
  }
}

export async function resolveExportBrand(entitlements: VectorEntitlements): Promise<Brand> {
  if (!entitlements.companyBranding) return VECTOR_BRAND;
  try {
    const profile = await fetchVectorBrandProfile();
    if (!profile?.organisationName) return VECTOR_BRAND;
    const logoFile = profile.hasLogo ? await fetchVectorBrandLogo() : null;
    const logo = logoFile ? await decodeBrandLogo(logoFile.data, logoFile.contentType) : undefined;
    return brandFromProfile(profile, logo);
  } catch {
    return VECTOR_BRAND;
  }
}

export function defaultEntitlements(): VectorEntitlements {
  return entitlementsForPlan("free");
}

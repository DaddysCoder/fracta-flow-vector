export type BrandMode = "vector_product_brand" | "provider_brand_profile";

export interface Brand {
  mode: BrandMode;
  name: string;
  /** Hex, no leading "#" — that's what docx's color options expect. */
  ink: string;
  paper: string;
  accent: string;
  /** Heading font family for exported titles/section headings. Undefined
   * lets docx/print fall back to the default document font. */
  headingFont?: string;
}

/** Vector's default brand for standalone exports. */
export const VECTOR_BRAND: Brand = {
  mode: "vector_product_brand",
  name: "Vector",
  ink: "111111",
  paper: "FFFFFF",
  accent: "7B2FF7",
};

/** Backward-compatible symbol for older internal imports. */
export const FRACTA_FLOW_BRAND: Brand = VECTOR_BRAND;

/** Paid organisation-branded exports override Vector's defaults. */
export function providerBrand(provider: {
  name: string;
  ink?: string;
  paper?: string;
  accent?: string;
  headingFont?: string;
}): Brand {
  return {
    mode: "provider_brand_profile",
    name: provider.name,
    ink: provider.ink ?? VECTOR_BRAND.ink,
    paper: provider.paper ?? VECTOR_BRAND.paper,
    accent: provider.accent ?? VECTOR_BRAND.accent,
    headingFont: provider.headingFont,
  };
}

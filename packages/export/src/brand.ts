export type BrandMode = "fracta_flow_product_brand" | "provider_brand_profile";

export interface Brand {
  mode: BrandMode;
  name: string;
  /** Hex, no leading "#" — that's what docx's color options expect. */
  ink: string;
  paper: string;
  accent: string;
}

/** Standalone tools and their downloads always use this brand. */
export const FRACTA_FLOW_BRAND: Brand = {
  mode: "fracta_flow_product_brand",
  name: "Fracta Flow",
  ink: "111111",
  paper: "FFFFFF",
  accent: "7B2FF7",
};

/** Connected workflow exports may use the provider's own brand profile instead. */
export function providerBrand(provider: { name: string; ink?: string; paper?: string; accent?: string }): Brand {
  return {
    mode: "provider_brand_profile",
    name: provider.name,
    ink: provider.ink ?? FRACTA_FLOW_BRAND.ink,
    paper: provider.paper ?? FRACTA_FLOW_BRAND.paper,
    accent: provider.accent ?? FRACTA_FLOW_BRAND.accent,
  };
}

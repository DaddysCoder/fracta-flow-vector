import { describe, expect, it } from "vitest";
import { VECTOR_BRAND } from "@pbs/export";
import {
  FREE_ENTITLEMENTS,
  PAID_ENTITLEMENTS,
  canUseFeature,
  entitlementsForPlan,
} from "../src/commercial/entitlements.js";

describe("Vector commercial entitlements", () => {
  it("keeps all premium actions off on the free plan", () => {
    expect(canUseFeature(FREE_ENTITLEMENTS, "export")).toBe(false);
    expect(canUseFeature(FREE_ENTITLEMENTS, "company_branding")).toBe(false);
    expect(canUseFeature(FREE_ENTITLEMENTS, "support_templates")).toBe(false);
  });

  it("unlocks exports, branding and support templates together on paid", () => {
    expect(canUseFeature(PAID_ENTITLEMENTS, "export")).toBe(true);
    expect(canUseFeature(PAID_ENTITLEMENTS, "company_branding")).toBe(true);
    expect(canUseFeature(PAID_ENTITLEMENTS, "support_templates")).toBe(true);
  });

  it("gates the BSP Review / Change Addendum (document 13) the same as the other net-new paid documents", () => {
    expect(canUseFeature(FREE_ENTITLEMENTS, "bsp_review_addendum")).toBe(false);
    expect(canUseFeature(PAID_ENTITLEMENTS, "bsp_review_addendum")).toBe(true);
  });

  it("maps the one-tier launch model deterministically", () => {
    expect(entitlementsForPlan("free")).toBe(FREE_ENTITLEMENTS);
    expect(entitlementsForPlan("paid")).toBe(PAID_ENTITLEMENTS);
  });

  it("uses Vector as the default export brand", () => {
    expect(VECTOR_BRAND.name).toBe("Vector");
    expect(VECTOR_BRAND.mode).toBe("vector_product_brand");
  });
});

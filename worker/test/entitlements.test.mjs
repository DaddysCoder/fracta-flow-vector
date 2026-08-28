import { describe, expect, it } from "vitest";
import { isVectorPaidSubscription, entitlementsForSubscription } from "../entitlements.mjs";

const FREE = Object.freeze({ plan: "free" });
const PAID = Object.freeze({ plan: "paid" });
const VECTOR_PRICE = "price_1U9IgWFIXid8q5wwQNGrCIUQ";

describe("Vector paid entitlement", () => {
  it("requires the exact Vector Stripe price", () => {
    expect(
      isVectorPaidSubscription(
        { status: "active", provider_price_id: VECTOR_PRICE },
        VECTOR_PRICE,
      ),
    ).toBe(true);
  });

  it("keeps an active subscription on the wrong price on the free plan", () => {
    expect(
      isVectorPaidSubscription(
        { status: "active", provider_price_id: "price_other_product" },
        VECTOR_PRICE,
      ),
    ).toBe(false);
  });

  it("does not treat inactive statuses as paid", () => {
    expect(
      isVectorPaidSubscription(
        { status: "canceled", provider_price_id: VECTOR_PRICE },
        VECTOR_PRICE,
      ),
    ).toBe(false);
  });

  it("maps entitlements from subscription + price", () => {
    expect(
      entitlementsForSubscription(
        { status: "trialing", provider_price_id: VECTOR_PRICE },
        VECTOR_PRICE,
        FREE,
        PAID,
      ),
    ).toBe(PAID);
    expect(
      entitlementsForSubscription(
        { status: "active", provider_price_id: "price_wrong" },
        VECTOR_PRICE,
        FREE,
        PAID,
      ),
    ).toBe(FREE);
  });
});

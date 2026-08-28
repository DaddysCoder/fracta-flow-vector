const PAID_STATUSES = new Set(["active", "trialing"]);

export function isVectorPaidSubscription(subscription, vectorPriceId) {
  if (!subscription || !vectorPriceId) return false;
  if (!PAID_STATUSES.has(subscription.status)) return false;
  return subscription.provider_price_id === vectorPriceId;
}

export function entitlementsForSubscription(subscription, vectorPriceId, freeEntitlements, paidEntitlements) {
  return isVectorPaidSubscription(subscription, vectorPriceId) ? paidEntitlements : freeEntitlements;
}

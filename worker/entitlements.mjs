const PAID_STATUSES = new Set(["active", "trialing"]);

function normalisePriceIds(vectorPriceIds) {
  if (!vectorPriceIds) return [];
  return Array.isArray(vectorPriceIds) ? vectorPriceIds.filter(Boolean) : [vectorPriceIds];
}

export function isVectorPaidSubscription(subscription, vectorPriceIds) {
  if (!subscription) return false;
  if (!PAID_STATUSES.has(subscription.status)) return false;
  return normalisePriceIds(vectorPriceIds).includes(subscription.provider_price_id);
}

export function entitlementsForSubscription(
  subscription,
  vectorPriceIds,
  freeEntitlements,
  paidEntitlements,
) {
  return isVectorPaidSubscription(subscription, vectorPriceIds) ? paidEntitlements : freeEntitlements;
}

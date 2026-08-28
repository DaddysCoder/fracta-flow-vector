/**
 * Support Letter funding-quote math. Pure and unit-tested on its own
 * (`test/supportLetterQuote.test.ts`) because the travel apportionment
 * formula was explicitly corrected mid-design in the handoff (it is NOT a
 * flat percentage loading) and is exactly the kind of thing that
 * regresses silently if only eyeballed in the UI.
 */

export interface QuoteLineItem {
  key: string;
  label: string;
  category: "Specialist Behaviour Support" | "Plan Implementation";
  hours: number;
}

export const SUPPORT_LETTER_LINE_ITEMS: Array<{
  key: string;
  label: string;
  category: QuoteLineItem["category"];
}> = [
  { key: "sessions", label: "Specialist behaviour intervention support (direct sessions)", category: "Specialist Behaviour Support" },
  { key: "mdt", label: "Multidisciplinary team coordination", category: "Specialist Behaviour Support" },
  { key: "incident", label: "Incident data collection and review", category: "Specialist Behaviour Support" },
  { key: "resources", label: "Resource development", category: "Specialist Behaviour Support" },
  { key: "planwriting", label: "Behaviour support plan writing", category: "Plan Implementation" },
  { key: "training", label: "Staff training", category: "Plan Implementation" },
  { key: "rrp_docs", label: "Restrictive practice documentation (if present)", category: "Plan Implementation" },
  { key: "progress", label: "Progress report preparation", category: "Plan Implementation" },
];

/**
 * Travel is apportioned, not a flat percentage: half the return travel
 * time, split across everyone seen on that trip — matches Trace's
 * convention. `(travel_hours / 2) / participants_seen_this_trip`.
 * Returns 0 (not NaN/Infinity) for missing or non-positive inputs, so a
 * half-filled form never produces a broken total.
 */
export function apportionedTravelHours(travelHours: number, participantsSeenThisTrip: number): number {
  if (!Number.isFinite(travelHours) || !Number.isFinite(participantsSeenThisTrip)) return 0;
  if (travelHours <= 0 || participantsSeenThisTrip <= 0) return 0;
  return travelHours / 2 / participantsSeenThisTrip;
}

export interface QuoteTotals {
  totalHours: number;
  subtotal: number;
  travelHours: number;
  travelAmount: number;
  grandTotal: number;
}

export function computeQuoteTotals(
  hoursByKey: Record<string, number>,
  hourlyRate: number,
  travelHours: number,
  travelParticipants: number,
  includeTravel: boolean,
): QuoteTotals {
  const rate = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;
  const totalHours = SUPPORT_LETTER_LINE_ITEMS.reduce((sum, item) => {
    const h = hoursByKey[item.key];
    return sum + (typeof h === "number" && Number.isFinite(h) ? Math.max(0, h) : 0);
  }, 0);
  const subtotal = totalHours * rate;
  const apportioned = includeTravel ? apportionedTravelHours(travelHours, travelParticipants) : 0;
  const travelAmount = apportioned * rate;
  return {
    totalHours,
    subtotal,
    travelHours: apportioned,
    travelAmount,
    grandTotal: subtotal + travelAmount,
  };
}

export function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

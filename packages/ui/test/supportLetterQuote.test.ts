import { describe, expect, it } from "vitest";
import { apportionedTravelHours, computeQuoteTotals } from "../src/support-letter/quote.js";

describe("apportionedTravelHours", () => {
  it("halves the return travel time then splits it across participants seen this trip", () => {
    // Explicitly corrected mid-design: NOT a flat percentage loading.
    expect(apportionedTravelHours(4, 2)).toBe(1); // (4 / 2) / 2
    expect(apportionedTravelHours(3, 1)).toBe(1.5); // (3 / 2) / 1
  });

  it("returns 0 for missing, zero or negative inputs rather than NaN/Infinity", () => {
    expect(apportionedTravelHours(0, 2)).toBe(0);
    expect(apportionedTravelHours(4, 0)).toBe(0);
    expect(apportionedTravelHours(NaN, 2)).toBe(0);
    expect(apportionedTravelHours(4, NaN)).toBe(0);
    expect(apportionedTravelHours(-4, 2)).toBe(0);
  });
});

describe("computeQuoteTotals", () => {
  it("sums line-item hours at the hourly rate, with travel excluded by default", () => {
    const totals = computeQuoteTotals({ sessions: 2, mdt: 1 }, 100, 4, 2, false);
    expect(totals.totalHours).toBe(3);
    expect(totals.subtotal).toBe(300);
    expect(totals.travelAmount).toBe(0);
    expect(totals.grandTotal).toBe(300);
  });

  it("adds the apportioned travel amount only when included", () => {
    const totals = computeQuoteTotals({ sessions: 2 }, 100, 4, 2, true);
    // apportioned travel = (4/2)/2 = 1 hour, at $100 = $100
    expect(totals.travelHours).toBe(1);
    expect(totals.travelAmount).toBe(100);
    expect(totals.grandTotal).toBe(300); // 2h * $100 + $100 travel
  });

  it("never negative-hours a line item", () => {
    const totals = computeQuoteTotals({ sessions: -5 }, 100, 0, 0, false);
    expect(totals.totalHours).toBe(0);
    expect(totals.subtotal).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { assessBudget, demoLimits, stellarUsdcDecimals } from "../lib/policy/budget";

const budget = { price: "10000000", purchaseCap: demoLimits.perPurchaseCap, projectBudget: demoLimits.projectBudget, settledSpend: "0", pendingReservations: "0", demoAdjustments: "0" };

describe("budget policy arithmetic", () => {
  it("uses Stellar's seven decimal places", () => {
    expect(stellarUsdcDecimals).toBe(7);
    expect(assessBudget(budget)).toEqual({ allowed: true, code: "WITHIN_LIMITS", availableBaseUnits: "50000000" });
  });
  it("blocks over-cap purchases", () => expect(assessBudget({ ...budget, purchaseCap: "5000000" }).code).toBe("PURCHASE_CAP_EXCEEDED"));
  it("counts pending reservations and explicit adjustments", () => {
    expect(assessBudget({ ...budget, settledSpend: "20000000", pendingReservations: "20000000", demoAdjustments: "5000001" }).code).toBe("PROJECT_BUDGET_EXCEEDED");
  });
  it("accepts the exact boundary and refuses one base unit over", () => {
    expect(assessBudget({ ...budget, settledSpend: "40000000" }).allowed).toBe(true);
    expect(assessBudget({ ...budget, settledSpend: "40000001" }).allowed).toBe(false);
  });
  it("fails closed if accounting already exceeds the budget", () => expect(assessBudget({ ...budget, settledSpend: "60000000" }).availableBaseUnits).toBe("0"));
  it.each(["-1", "0.1", "1e7", "9223372036854775808"])("rejects unsafe amounts %s", price => expect(() => assessBudget({ ...budget, price })).toThrow());
  it("rejects numeric rather than string money and zero-price sales", () => {
    expect(() => assessBudget({ ...budget, price: 1 as unknown as string })).toThrow();
    expect(() => assessBudget({ ...budget, price: "0" })).toThrow();
  });
});

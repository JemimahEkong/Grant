import { z } from "zod";

export const stellarUsdcDecimals = 7;
export const demoLimits = { projectBudget: "50000000", perPurchaseCap: "20000000" } as const;

const amountPattern = /^(0|[1-9]\d{0,18})$/;
export const amountBaseUnitsSchema = z.string().regex(amountPattern).refine(value => !amountPattern.test(value) || BigInt(value) <= 9_223_372_036_854_775_807n, "Amount exceeds PostgreSQL bigint capacity.");
export const positiveAmountBaseUnitsSchema = amountBaseUnitsSchema.refine(value => BigInt(value) > 0n, "Amount must be positive.");
const budgetSchema = z.strictObject({
  price: positiveAmountBaseUnitsSchema,
  purchaseCap: amountBaseUnitsSchema,
  projectBudget: amountBaseUnitsSchema,
  settledSpend: amountBaseUnitsSchema,
  pendingReservations: amountBaseUnitsSchema,
  demoAdjustments: amountBaseUnitsSchema,
});

export function parseAmountBaseUnits(value: string): bigint {
  return BigInt(amountBaseUnitsSchema.parse(value));
}

export function parsePositiveAmountBaseUnits(value: string): bigint {
  return BigInt(positiveAmountBaseUnitsSchema.parse(value));
}

export function assessBudget(input: z.input<typeof budgetSchema>) {
  const values = budgetSchema.parse(input);
  const available = BigInt(values.projectBudget) - BigInt(values.settledSpend) - BigInt(values.pendingReservations) - BigInt(values.demoAdjustments);
  const availableBaseUnits = (available > 0n ? available : 0n).toString();
  if (BigInt(values.price) > BigInt(values.purchaseCap)) return { allowed: false, code: "PURCHASE_CAP_EXCEEDED", availableBaseUnits } as const;
  if (BigInt(values.price) > available) return { allowed: false, code: "PROJECT_BUDGET_EXCEEDED", availableBaseUnits } as const;
  return { allowed: true, code: "WITHIN_LIMITS", availableBaseUnits } as const;
}

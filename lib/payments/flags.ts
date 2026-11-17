export function paymentsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PAYMENTS_ENABLED === "true";
}

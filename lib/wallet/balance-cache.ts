import { getWalletBalance, type WalletBalance } from "./stellar";

const ttlMs = 30_000;
const cache = new Map<string, { value: WalletBalance; fetchedAt: number }>();

export async function getCachedWalletBalance(publicKey: string, refresh = false): Promise<WalletBalance> {
  const now = Date.now();
  const cached = cache.get(publicKey);
  if (!refresh && cached && now - cached.fetchedAt < ttlMs) return cached.value;
  const value = await getWalletBalance(publicKey);
  cache.set(publicKey, { value, fetchedAt: now });
  return value;
}

export function invalidateWalletBalance(publicKey: string): void {
  cache.delete(publicKey);
}

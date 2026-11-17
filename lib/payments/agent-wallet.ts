import { RepositoryError } from "../db/errors";
import { getUsdcBalance } from "./verify-settlement";

export type AgentWallet = {
  configured: boolean;
  readOnly: true;
  address: string | null;
  network: "stellar:testnet";
  asset: "USDC";
  balance: string | null;
};

export async function getAgentWallet(): Promise<AgentWallet> {
  const address = process.env.X402_BUYER_PUBLIC;
  if (!address) {
    return {
      configured: false,
      readOnly: true,
      address: null,
      network: "stellar:testnet",
      asset: "USDC",
      balance: null,
    };
  }
  try {
    return {
      configured: true,
      readOnly: true,
      address,
      network: "stellar:testnet",
      asset: "USDC",
      balance: await getUsdcBalance(address),
    };
  } catch {
    throw new RepositoryError("WALLET_UNAVAILABLE", "The agent wallet balance is unavailable.", 503);
  }
}

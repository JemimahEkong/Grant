import offersJson from "../offers.json";
import { marketOfferListSchema, type MarketOffer } from "./terms";

export function sellerPayee(): string {
  const payee = process.env.SELLER_PAYEE?.trim();
  if (!payee || !/^G[A-Z2-7]{55}$/.test(payee)) {
    throw new Error("SELLER_PAYEE is not a valid Stellar public key.");
  }
  return payee;
}

export function getOffers(): MarketOffer[] {
  const payee = sellerPayee();
  return marketOfferListSchema.parse({
    offers: offersJson.offers.map(offer => ({ ...offer, payee })),
  }).offers;
}

export function getOffer(id: string): MarketOffer | null {
  return getOffers().find(offer => offer.id === id) ?? null;
}

export function publicBaseUrl(): string {
  return (process.env.SELLER_PUBLIC_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

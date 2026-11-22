import { createDownloadToken } from "./download";
import { publicBaseUrl } from "./offers";
import type { MarketOffer } from "./terms";
import type { SellerLicense } from "./store";

export function buildLicense(
  offer: MarketOffer,
  transactionHash: string,
  payer: string,
  issuedAt = new Date().toISOString(),
  settlementTransactionHash: string | null = null,
): SellerLicense {
  return {
    id: `sl_${transactionHash.slice(0, 16)}`,
    offerId: offer.id,
    title: offer.title,
    artist: offer.artist,
    terms: offer.terms,
    issuedAt,
    transactionHash,
    settlementTransactionHash,
    payer,
    payee: offer.payee,
    amountBaseUnits: offer.priceBaseUnits,
    asset: offer.asset,
    network: offer.network,
  };
}

export function licenseResponse(offer: MarketOffer, license: SellerLicense) {
  return {
    license,
    attribution: offer.terms.attributionText,
    downloadUrl: `${publicBaseUrl()}/api/download?token=${createDownloadToken({
      licenseId: license.id,
      offerId: offer.id,
    })}`,
    proofUrl: `${publicBaseUrl()}/proof/${license.id}`,
  };
}

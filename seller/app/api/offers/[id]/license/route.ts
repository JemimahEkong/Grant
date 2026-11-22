import { HTTPFacilitatorClient, AfterSettleAbortError, x402HTTPResourceServer, x402ResourceServer, type RouteConfig, type RoutesConfig } from "@x402/core/server";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { withX402FromHTTPServer } from "@x402/next";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { Networks, Transaction } from "@stellar/stellar-sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildLicense, licenseResponse } from "../../../../../lib/license";
import { getOffer } from "../../../../../lib/offers";
import { findLicenseByTxHash, insertLicense } from "../../../../../lib/store";
import { MARKET_TERMS_EXTENSION_KEY, type MarketOffer } from "../../../../../lib/terms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const network = "stellar:testnet";
const facilitatorUrl = process.env.SELLER_FACILITATOR_URL ?? "https://www.x402.org/facilitator";

function payloadHash(payload: { payload?: { transaction?: string } }): { hash: string; source: string } {
  const xdr = payload.payload?.transaction;
  if (!xdr) throw new Error("The payment payload has no transaction.");
  const transaction = new Transaction(xdr, Networks.TESTNET);
  return { hash: Buffer.from(transaction.hash()).toString("hex"), source: transaction.source };
}

function paymentHash(header: string): { hash: string; source: string } {
  return payloadHash(decodePaymentSignatureHeader(header) as { payload?: { transaction?: string } });
}

const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl })).register(
  network,
  new ExactStellarScheme(),
);

resourceServer.onAfterSettle(async context => {
  try {
    const settlementTransactionHash = context.result.transaction;
    if (!settlementTransactionHash) return;
    const authorization = payloadHash(context.paymentPayload as { payload?: { transaction?: string } });
    const existing = await findLicenseByTxHash(authorization.hash);
    if (existing) return;
    const extra = context.requirements.extra as { offerId?: string } | undefined;
    const offer = extra?.offerId ? getOffer(extra.offerId) : null;
    if (!offer) return;
    const license = buildLicense(
      offer,
      authorization.hash,
      context.result.payer ?? authorization.source,
      new Date().toISOString(),
      settlementTransactionHash,
    );
    await insertLicense({
      transactionHash: authorization.hash,
      licenseId: license.id,
      offerId: offer.id,
      license,
      payer: license.payer,
      payee: context.requirements.payTo,
      amountBaseUnits: context.requirements.amount,
      asset: context.requirements.asset,
      network: context.requirements.network,
      settlementTransactionHash,
      issuedAt: new Date(license.issuedAt),
    });
  } catch (error) {
    throw new AfterSettleAbortError(
      "LICENSE_STORE_FAILED",
      error instanceof Error ? error.message : "The license could not be stored.",
    );
  }
});

async function handle(request: NextRequest, offer: MarketOffer): Promise<NextResponse> {
  const header = request.headers.get("payment-signature") ?? request.headers.get("x-payment");
  if (!header) {
    return NextResponse.json({ code: "PAYMENT_REQUIRED", message: "Payment required." }, { status: 402 });
  }

  const { hash, source } = paymentHash(header);
  const existing = await findLicenseByTxHash(hash);
  if (existing) {
    return NextResponse.json(licenseResponse(offer, existing.license));
  }

  const license = buildLicense(offer, hash, source);
  return NextResponse.json(licenseResponse(offer, license));
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const offer = getOffer(id);
  if (!offer) {
    return NextResponse.json({ code: "OFFER_NOT_FOUND", message: "The offer was not found." }, { status: 404 });
  }

  const routeConfig: RouteConfig = {
    accepts: {
      scheme: "exact",
      network,
      price: () => ({ asset: offer.asset, amount: offer.priceBaseUnits }),
      payTo: offer.payee,
      maxTimeoutSeconds: 60,
      extra: { offerId: offer.id },
    },
    resource: `${new URL(request.url).origin}/api/offers/${offer.id}/license`,
    description: `${offer.title} license`,
    mimeType: "application/json",
    extensions: { [MARKET_TERMS_EXTENSION_KEY]: offer.terms },
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: {
        error: "Payment required",
        extensions: { [MARKET_TERMS_EXTENSION_KEY]: offer.terms },
      },
    }),
  };

  const routes: RoutesConfig = { [`/api/offers/${offer.id}/license`]: routeConfig };
  const httpServer = new x402HTTPResourceServer(resourceServer, routes).onProtectedRequest(async httpContext => {
    const header =
      httpContext.adapter.getHeader("payment-signature") ?? httpContext.adapter.getHeader("x-payment");
    if (!header) return;
    try {
      const { hash } = paymentHash(header);
      const existing = await findLicenseByTxHash(hash);
      if (existing) return { grantAccess: true };
    } catch {
      // A malformed payment falls through to the normal x402 verification path.
    }
  });

  return withX402FromHTTPServer(
    innerRequest => handle(innerRequest, offer),
    httpServer,
    undefined,
    undefined,
    true,
  )(request);
}

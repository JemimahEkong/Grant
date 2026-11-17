import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { withX402 } from "@x402/next";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { NextResponse } from "next/server";
import { isStellarPublicKey } from "../../../../lib/payments/stellar-address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const network = "stellar:testnet";
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://www.x402.org/facilitator";
const payTo = process.env.X402_SELLER_PUBLIC;

async function handler(): Promise<NextResponse> {
  return NextResponse.json({
    grantX402: "settled",
    mode: "nextjs-testnet-spike",
    network,
    note: "Protocol proof only. No license, audio, PDF, entitlement, or product purchase is granted.",
    servedAt: new Date().toISOString(),
  });
}

function unavailable() {
  return NextResponse.json(
    {
      code: "X402_SELLER_NOT_CONFIGURED",
      message: "The x402 testnet seller is not configured.",
    },
    { status: 503 },
  );
}

function buildHandler() {
  if (!payTo || !isStellarPublicKey(payTo)) return unavailable;

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const server = new x402ResourceServer(facilitator).register(network, new ExactStellarScheme());

  return withX402(
    handler,
    {
      accepts: {
        scheme: "exact",
        price: "$0.01",
        network,
        payTo,
      },
      description: "Grant x402 testnet protocol spike",
      mimeType: "application/json",
    },
    server,
  );
}

export const GET = buildHandler();

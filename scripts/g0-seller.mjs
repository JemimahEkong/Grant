import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

const port = Number(process.env.G0_PORT ?? "4021");
const host = "127.0.0.1";
const route = "/g0/license";
const network = "stellar:testnet";
const facilitatorUrl = process.env.G0_FACILITATOR_URL ?? "https://www.x402.org/facilitator";
const payTo = process.env.G0_SELLER_PUBLIC;
const price = process.env.G0_PRICE ?? "$0.01";

if (!payTo) {
  console.error("G0_SELLER_PUBLIC is not configured. Run scripts/g0-setup.mjs first.");
  process.exit(1);
}

const app = express();

app.get("/", (_request, response) => {
  response.json({
    mode: "local-g0-spike",
    route: `GET ${route}`,
    network,
    price,
    purchasesEnabled: false,
  });
});

app.use(
  paymentMiddlewareFromConfig(
    {
      [`GET ${route}`]: {
        accepts: {
          scheme: "exact",
          price,
          network,
          payTo,
        },
      },
    },
    new HTTPFacilitatorClient({ url: facilitatorUrl }),
    [{ network, server: new ExactStellarScheme() }],
  ),
);

app.get(route, (_request, response) => {
  response.json({
    grantG0: "settled",
    note: "Local protocol spike only. No license, entitlement, or delivered audio is granted by this response.",
    servedAt: new Date().toISOString(),
  });
});

const server = app.listen(port, host, () => {
  console.log(`G0 seller listening on http://${host}:${port}${route}`);
  console.log(`Network: ${network}`);
  console.log(`Pay to: ${payTo}`);
  console.log(`Price: ${price}`);
  console.log("Local-only throwaway seller. Do not deploy this script.");
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

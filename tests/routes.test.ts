import { describe, expect, it } from "vitest";
import { GET as health } from "../app/api/health/route";
import { GET as catalog } from "../app/api/catalog/route";
import { POST as matches } from "../app/api/license/matches/route";
import { closeDatabase } from "../lib/db/client";

const body = { intendedUse: "paid_ad", platforms: ["instagram", "tiktok"], territory: { worldwide: true, countries: [] }, termDays: 90, clipDurationSeconds: 30, clientDelivery: true, reposting: false, futureCampaigns: false };

function request(value: unknown) {
  return new Request("http://localhost/api/license/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
}

async function catalogResponse() {
  const previous = process.env.DATABASE_URL;
  if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  try {
    return await catalog();
  } finally {
    await closeDatabase();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
}

describe("backend routes", () => {
  it("reports the current testnet product phase with a stable response", async () => {
    const response = health();
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      product: "Grant",
      status: "ok",
      phase: "testnet-product-demo",
      databaseConfigured: expect.any(Boolean),
      purchasesEnabled: expect.any(Boolean),
    });
    expect(Object.keys(body).sort()).toEqual([
      "databaseConfigured",
      "phase",
      "product",
      "purchasesEnabled",
      "status",
    ]);
  });
  it("labels catalog terms as fixtures with CC0 audio and no authority evidence", async () => {
    const response = await catalogResponse();
    expect(await response.json()).toMatchObject({ mode: "fixture", audioAvailable: true, purchasesEnabled: expect.any(Boolean), offers: expect.any(Array) });
  });
  it("returns paid-ad compatibility and specific refusal reasons", async () => {
    const response = await matches(request(body));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.purchasesEnabled).toBe(false);
    expect(result.results.filter((offer: { compatible: boolean }) => offer.compatible)).toHaveLength(1);
  });
  it("rejects missing details rather than defaulting permission", async () => expect((await matches(request({ intendedUse: "paid_ad" }))).status).toBe(400));
  it("rejects malformed JSON and unsupported content types", async () => {
    expect((await matches(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status).toBe(400);
    expect((await matches(new Request("http://localhost", { method: "POST", body: JSON.stringify(body) }))).status).toBe(415);
  });
  it("rejects excessive bodies", async () => expect((await matches(request({ text: "a".repeat(17_000) }))).status).toBe(413));
});

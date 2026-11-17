import { describe, expect, it } from "vitest";
import { GET as health } from "../app/api/health/route";
import { GET as catalog } from "../app/api/catalog/route";
import { POST as matches } from "../app/api/license/matches/route";

const body = { intendedUse: "paid_ad", platforms: ["instagram", "tiktok"], territory: { worldwide: true, countries: [] }, termDays: 90, clipDurationSeconds: 30, clientDelivery: true, reposting: false, futureCampaigns: false };

function request(value: unknown) {
  return new Request("http://localhost/api/license/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
}

describe("backend routes", () => {
  it("reports a healthy foundation without claiming payment is enabled", async () => {
    const response = health();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ status: "ok", purchasesEnabled: expect.any(Boolean) });
  });
  it("labels catalog terms as fixtures without audio or authority evidence", async () => {
    expect(await catalog().json()).toMatchObject({ mode: "fixture", audioAvailable: false, purchasesEnabled: expect.any(Boolean), offers: expect.any(Array) });
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

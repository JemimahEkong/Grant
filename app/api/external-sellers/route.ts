import { NextResponse } from "next/server";

type SellerHealth = {
  url: string;
  healthy: boolean;
  service?: string;
  network?: string;
  offerCount?: number;
};

function sellerUrls(): string[] {
  return (process.env.EXTERNAL_SELLER_URLS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

export async function GET() {
  const urls = sellerUrls();
  const sellers = await Promise.all(
    urls.map(async (url): Promise<SellerHealth> => {
      try {
        const response = await fetch(`${url.replace(/\/$/, "")}/api/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
        if (!response.ok) return { url, healthy: false };
        const body = (await response.json()) as {
          service?: string;
          network?: string;
          offerCount?: number;
        };
        return {
          url,
          healthy: true,
          service: body.service,
          network: body.network,
          offerCount: body.offerCount,
        };
      } catch {
        return { url, healthy: false };
      }
    }),
  );
  return NextResponse.json({ sellers });
}

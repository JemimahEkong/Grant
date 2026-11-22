import { getOffers } from "../lib/offers";
import { MARKET_NETWORK } from "../lib/terms";

export const dynamic = "force-dynamic";

export default function Home() {
  const offers = getOffers();
  return (
    <main>
      <p className="tag">External seller</p>
      <h1>Grant Market Seller</h1>
      <p>
        A separate service with its own payee, terms, database, and deployment. The Grant buyer agent
        discovers these offers over HTTP and pays per license on {MARKET_NETWORK}.
      </p>
      <p>
        Offers: <code>/api/offers</code> · Health: <code>/api/health</code>
      </p>
      {offers.map(offer => (
        <section className="offer" key={offer.id}>
          <h2>{offer.title}</h2>
          <p>
            {offer.artist} · {offer.durationSeconds}s · {(Number(offer.priceBaseUnits) / 10_000_000).toFixed(2)} USDC
          </p>
          <dl>
            <dt>License</dt>
            <dd>{offer.terms.licenseCode} · {offer.terms.attributionText}</dd>
            <dt>Platforms</dt>
            <dd>{offer.terms.platforms.join(", ")}</dd>
            <dt>Term</dt>
            <dd>{offer.terms.termDays} days</dd>
            <dt>Territory</dt>
            <dd>{offer.terms.territory.worldwide ? "Worldwide" : offer.terms.territory.countries.join(", ")}</dd>
            <dt>Paid ads</dt>
            <dd>{offer.terms.paidAds ? "Allowed" : "Not offered"}</dd>
            <dt>Client delivery</dt>
            <dd>{offer.terms.clientDelivery ? "Allowed" : "Not offered"}</dd>
            <dt>Payee</dt>
            <dd><code>{offer.payee}</code></dd>
          </dl>
        </section>
      ))}
    </main>
  );
}

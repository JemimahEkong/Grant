import { findLicenseById } from "../../../lib/store";

export const dynamic = "force-dynamic";

export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await findLicenseById(id);
  if (!record) {
    return (
      <main>
        <h1>License not found</h1>
        <p>No seller license matches this reference.</p>
      </main>
    );
  }
  return (
    <main>
      <p className="tag">Public proof</p>
      <h1>{record.license.title}</h1>
      <p>{record.license.artist} · {record.license.terms.attributionText}</p>
      <section className="offer">
        <dl>
          <dt>License</dt>
          <dd><code>{record.licenseId}</code></dd>
          <dt>Offer</dt>
          <dd><code>{record.offerId}</code></dd>
          <dt>Transaction</dt>
          <dd><code>{record.transactionHash}</code></dd>
          <dt>Payer</dt>
          <dd><code>{record.payer}</code></dd>
          <dt>Payee</dt>
          <dd><code>{record.payee}</code></dd>
          <dt>Amount</dt>
          <dd>{(Number(record.amountBaseUnits) / 10_000_000).toFixed(2)} USDC</dd>
          <dt>Network</dt>
          <dd>{record.network}</dd>
          <dt>Issued</dt>
          <dd>{record.issuedAt.toISOString()}</dd>
        </dl>
      </section>
      <section className="offer">
        <h2>Terms snapshot</h2>
        <pre>{JSON.stringify(record.license.terms, null, 2)}</pre>
      </section>
    </main>
  );
}

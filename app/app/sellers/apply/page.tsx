"use client";

import Link from "next/link";
import { useState } from "react";
import { useMe } from "../../../../components/providers";
import { EmptyState, PageHeader, PrimaryButton, Spinner } from "../../../../components/ui";
import { createSellerApplication } from "../../../../lib/ui/actions";
import type { SellerApplication } from "../../../../lib/ui/api";

export default function SellerApplyPage() {
  const { me } = useMe();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(me.user.email);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [catalogueUrl, setCatalogueUrl] = useState("");
  const [termsGranted, setTermsGranted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [application, setApplication] = useState<SellerApplication | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await createSellerApplication({
        name: name.trim(),
        email: email.trim(),
        payoutAddress: payoutAddress.trim(),
        catalogueUrl: catalogueUrl.trim(),
        termsGranted: termsGranted.trim(),
      });
      setApplication(result.application);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (application) {
    return (
      <>
        <PageHeader title="Application submitted" lede="The listing status is submitted. That is the whole state change." />
        <EmptyState
          title="Waiting for manual review"
          description={`Status: submitted. Reference ${application.id}. No payout was created. No offer was activated. No listing was approved automatically. A human will review the terms you granted.`}
          action={
            <Link href="/app" className="btn btn-secondary">
              Back to home
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Apply to sell music"
        lede="Tell us who you are, where a future payout would go, and the terms you grant. A human reviews every application."
      />

      <div className="explain-panel" role="note">
        <div className="h">Application only</div>
        <p>
          This creates an application with status submitted, not a live listing. Submitting does not create a payout,
          an offer, or an approved listing. No payout is sent now. Nothing is auto-approved.
        </p>
      </div>

      <form onSubmit={submit} className="stack brief-form">
        <div className="field">
          <label htmlFor="seller-name">Name or artist name</label>
          <input
            id="seller-name"
            className="input"
            value={name}
            onChange={event => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="seller-email">Email</label>
          <input
            id="seller-email"
            className="input"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <span className="form-hint">Used for the review only. It never appears on a public proof page.</span>
        </div>

        <div className="field">
          <label htmlFor="seller-payout">Payout address</label>
          <input
            id="seller-payout"
            className="input"
            value={payoutAddress}
            onChange={event => setPayoutAddress(event.target.value.toUpperCase())}
            placeholder="G..."
            autoComplete="off"
            spellCheck={false}
            maxLength={56}
            required
          />
          <span className="form-hint">
            A Stellar public key that starts with G. This is where a future payout would go. No payout is created now.
          </span>
        </div>

        <div className="field">
          <label htmlFor="seller-catalogue">Catalogue link</label>
          <input
            id="seller-catalogue"
            className="input"
            type="url"
            value={catalogueUrl}
            onChange={event => setCatalogueUrl(event.target.value)}
            placeholder="https://"
            autoComplete="url"
            required
          />
          <span className="form-hint">A public page where a reviewer can hear or download the tracks.</span>
        </div>

        <div className="field">
          <label htmlFor="seller-terms">Terms you grant</label>
          <textarea
            id="seller-terms"
            className="input"
            rows={7}
            value={termsGranted}
            onChange={event => setTermsGranted(event.target.value)}
            placeholder="Platforms, term, territory, media, client use, reposting, and any limits."
            required
          />
          <span className="form-hint">
            Plain language is fine. The reviewer needs the exact uses you allow and the uses you exclude.
          </span>
        </div>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <PrimaryButton className="btn-wide" type="submit" disabled={busy}>
          <span>{busy ? "Submitting application…" : "Submit for review"}</span>
          {busy ? <Spinner /> : <span aria-hidden="true">→</span>}
        </PrimaryButton>

        <p className="form-hint">
          Status after submit: submitted. No payout, no auto-approval, no live listing.
        </p>
      </form>
    </>
  );
}

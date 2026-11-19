"use client";

import type { ReactNode } from "react";
import { Spinner, PrimaryButton, Card } from "./ui";

const labels = ["Wallet", "Activate", "Trustline", "Fund"];

export function OnboardingStep({
  step,
  title,
  lede,
  children,
  actionLabel,
  onAction,
  busy = false,
  error,
  hideAction = false,
}: {
  step: number;
  title: string;
  lede: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
  hideAction?: boolean;
}) {
  return (
    <Card className="onboarding-card">
      <div className="onboarding-steps" aria-label="Onboarding progress">
        {labels.map((label, index) => (
          <div key={label} className={`onboarding-step${index < step ? " done" : index === step ? " on" : ""}`}>
            {label}
          </div>
        ))}
      </div>
      <div className="micro">Step {step + 1} of 4</div>
      <h1 className="onboarding-title">{title}</h1>
      <p className="page-lede">{lede}</p>
      <div style={{ marginTop: 18 }}>{children}</div>
      {error ? (
        <p className="error-text" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}
      {!hideAction && actionLabel && onAction ? (
        <PrimaryButton className="btn-wide" style={{ marginTop: 18 }} type="button" onClick={() => void onAction()} disabled={busy}>
          <span>{busy ? "Working…" : actionLabel}</span>
          {busy ? <Spinner /> : <span aria-hidden="true">→</span>}
        </PrimaryButton>
      ) : null}
    </Card>
  );
}

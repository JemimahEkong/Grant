import {
  ApiFailure,
  parseBody,
  request,
  type WalletView,
  type WalletTransaction,
  type ApprovalOutcome,
  type Artifact,
  type CatalogResponse,
  type Me,
  type PayOutcome,
  type Project,
  type ProjectView,
  type Purchase,
  type PurchaseView,
  type QuoteOutcome,
} from "./api";
import type { Brief } from "../licensing/schema";

export async function signIn(email: string, password: string): Promise<{ user: Me["user"] }> {
  return request("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUp(name: string, email: string, password: string): Promise<{ user: Me["user"] }> {
  return request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signOut(): Promise<void> {
  await request("/api/auth/sign-out", { method: "POST", body: JSON.stringify({}) });
}

export async function getMe(): Promise<Me> {
  return request("/api/me");
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return request("/api/projects");
}

export async function createProject(input: {
  clientPrivateName: string;
  publicDisplayLabel: string;
  brief: Brief;
}): Promise<{ project: Project }> {
  return request("/api/projects", { method: "POST", body: JSON.stringify(input) });
}

export async function getProject(projectId: string): Promise<ProjectView> {
  return request(`/api/projects/${projectId}`);
}

export async function getCatalog(): Promise<CatalogResponse> {
  return request("/api/catalog");
}

export async function createQuote(
  projectId: string,
  input: { trackId: string; offerId: string; offerVersion: number; kind: "base"; idempotencyKey: string },
): Promise<QuoteOutcome> {
  const response = await fetch(`/api/projects/${projectId}/quotes`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await parseBody(response)) as QuoteOutcome | { code?: string; message?: string } | null;
  if (response.ok || response.status === 422) return data as QuoteOutcome;
  const body = data as { code?: string; message?: string } | null;
  throw new ApiFailure(
    response.status,
    body?.code ?? `HTTP_${response.status}`,
    body?.message ?? "Could not create the quote.",
  );
}

export async function approvePurchase(purchaseId: string): Promise<ApprovalOutcome> {
  const response = await fetch(`/api/purchases/${purchaseId}/approve`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await parseBody(response)) as ApprovalOutcome | { code?: string; message?: string } | null;
  if (response.ok || response.status === 409) return data as ApprovalOutcome;
  const body = data as { code?: string; message?: string } | null;
  throw new ApiFailure(response.status, body?.code ?? `HTTP_${response.status}`, body?.message ?? "Approval failed.");
}

export async function payPurchase(purchaseId: string): Promise<PayOutcome> {
  const response = await fetch(`/api/purchases/${purchaseId}/pay`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await parseBody(response)) as PayOutcome | { code?: string; message?: string } | null;
  if (response.ok || response.status === 202) return data as PayOutcome;
  const body = data as { code?: string; message?: string } | null;
  throw new ApiFailure(
    response.status,
    body?.code ?? `HTTP_${response.status}`,
    body?.message ?? "Payment could not start.",
  );
}

export async function getPurchase(purchaseId: string): Promise<PurchaseView> {
  return request(`/api/purchases/${purchaseId}`);
}

export async function reconcilePurchase(purchaseId: string): Promise<PayOutcome> {
  const response = await fetch(`/api/purchases/${purchaseId}/reconcile`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await parseBody(response)) as PayOutcome | { code?: string; message?: string } | null;
  if (response.ok || response.status === 202) return data as PayOutcome;
  const body = data as { code?: string; message?: string } | null;
  throw new ApiFailure(
    response.status,
    body?.code ?? `HTTP_${response.status}`,
    body?.message ?? "Reconciliation failed.",
  );
}

export async function deliverPurchase(purchaseId: string): Promise<{
  pdf?: { artifact: Artifact; generated: boolean; downloadPath: string };
  audio?: { artifact: Artifact; attached: boolean; downloadPath: string } | { state: "not_prepared" };
  purchase: { id: string; status: string };
}> {
  return request(`/api/purchases/${purchaseId}/delivery/retry`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getDownloadUrl(
  purchaseId: string,
  asset: "audio" | "pdf",
): Promise<{ url: string; expiresAt: string; artifactKind: string }> {
  return request(`/api/purchases/${purchaseId}/download?asset=${asset}`);
}

export async function getWallet(refresh = false): Promise<WalletView> {
  return request(`/api/wallet${refresh ? "?refresh=1" : ""}`);
}

export async function createWallet(): Promise<WalletView> {
  return request("/api/wallet", { method: "POST", body: JSON.stringify({}) });
}

export async function activateWallet(): Promise<WalletView> {
  return request("/api/wallet/activate", { method: "POST", body: JSON.stringify({}) });
}

export async function addWalletTrustline(): Promise<WalletView> {
  return request("/api/wallet/trustline", { method: "POST", body: JSON.stringify({}) });
}

export async function fundWallet(): Promise<Record<string, unknown> & { wallet?: WalletView }> {
  return request("/api/wallet/faucet", { method: "POST", body: JSON.stringify({}) });
}

export async function refreshWallet(): Promise<WalletView> {
  return request("/api/wallet/refresh", { method: "POST", body: JSON.stringify({}) });
}

export async function getWalletTransactions(): Promise<{ transactions: WalletTransaction[] }> {
  return request("/api/wallet/transactions");
}

export async function createShare(purchaseId: string): Promise<{ token: string; url: string; shareLinkId: string }> {
  return request(`/api/purchases/${purchaseId}/share`, { method: "POST", body: JSON.stringify({}) });
}

export async function getShareStatus(purchaseId: string): Promise<{ active: boolean; shareLinkId: string | null }> {
  return request(`/api/purchases/${purchaseId}/share`);
}

export async function revokeShare(purchaseId: string): Promise<{ revoked: number }> {
  return request(`/api/purchases/${purchaseId}/share`, { method: "DELETE" });
}

export type { Purchase, PurchaseView };

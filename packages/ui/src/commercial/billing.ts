import type { BrandProfileInput } from "./brandProfile.js";
import type { PaidFeature, VectorEntitlements } from "./entitlements.js";

export type VectorPurchase = "single_document" | "monthly" | "yearly";

interface EntitlementResponse {
  entitlements: VectorEntitlements;
  subscription: {
    status: string;
    priceId?: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof body?.error === "string" ? body.error : "request_failed";
    throw new Error(code);
  }
  return body;
}

export async function fetchVectorEntitlements(): Promise<EntitlementResponse> {
  const response = await fetch("/api/entitlements", {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  return readJson(response) as Promise<EntitlementResponse>;
}

export async function startVectorCheckout(
  feature?: PaidFeature,
  purchase: VectorPurchase = "monthly",
): Promise<void> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ feature: feature ?? null, purchase }),
  });
  const body = await readJson(response);
  if (typeof body?.url !== "string") throw new Error("checkout_url_missing");
  window.location.assign(body.url);
}

export async function consumeVectorDocumentCredit(): Promise<number | null> {
  const response = await fetch("/api/document-credit/consume", {
    method: "POST",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  const body = await readJson(response);
  return typeof body?.remaining === "number" ? body.remaining : null;
}

export async function openVectorBillingPortal(): Promise<void> {
  const response = await fetch("/api/billing/portal", {
    method: "POST",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  const body = await readJson(response);
  if (typeof body?.url !== "string") throw new Error("portal_url_missing");
  window.location.assign(body.url);
}

export async function fetchVectorBrandProfile(): Promise<BrandProfileInput | null> {
  const response = await fetch("/api/brand-profile", {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  const body = await readJson(response);
  return body?.profile ?? null;
}

export async function saveVectorBrandProfile(profile: BrandProfileInput): Promise<BrandProfileInput> {
  const response = await fetch("/api/brand-profile", {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  const body = await readJson(response);
  if (!body?.profile) throw new Error("profile_save_failed");
  return body.profile as BrandProfileInput;
}

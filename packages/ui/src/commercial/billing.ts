import type { PaidFeature, VectorEntitlements } from "./entitlements.js";

interface EntitlementResponse {
  entitlements: VectorEntitlements;
  subscription: {
    status: string;
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

export async function startVectorCheckout(feature?: PaidFeature): Promise<void> {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ feature: feature ?? null }),
  });
  const body = await readJson(response);
  if (typeof body?.url !== "string") throw new Error("checkout_url_missing");
  window.location.assign(body.url);
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

import type { BrandProfileInput } from "./brandProfile.js";
import type { PaidFeature, VectorEntitlements } from "./entitlements.js";

/** GET /api/brand-profile's shape — the editable fields plus whether an
 * organisation logo is already persisted in R2 (never the logo bytes
 * themselves; those come from `fetchVectorBrandLogo`). */
export type BrandProfileRecord = BrandProfileInput & { hasLogo: boolean };

export const VECTOR_BRAND_LOGO_PATH = "/api/brand-profile/logo";

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

export async function fetchVectorBrandProfile(): Promise<BrandProfileRecord | null> {
  const response = await fetch("/api/brand-profile", {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  const body = await readJson(response);
  return body?.profile ?? null;
}

export async function saveVectorBrandProfile(profile: BrandProfileInput): Promise<BrandProfileRecord> {
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
  return body.profile as BrandProfileRecord;
}

/** Uploads (or replaces) the organisation's logo. Raw image bytes, not
 * JSON/multipart — the Worker validates MIME type and size and stores it
 * in R2 at a stable per-account key, never trusting `file.name`. */
export async function uploadVectorBrandLogo(file: Blob): Promise<void> {
  const response = await fetch(VECTOR_BRAND_LOGO_PATH, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": file.type,
    },
    body: file,
  });
  await readJson(response);
}

/** Fetches the persisted logo's raw bytes + content type, for embedding in
 * a DOCX export. Returns null if there's no logo (or it can't be reached),
 * never throws — export should always fall back to a logo-less document. */
export async function fetchVectorBrandLogo(): Promise<{ data: Uint8Array; contentType: string } | null> {
  const response = await fetch(VECTOR_BRAND_LOGO_PATH, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  const data = new Uint8Array(await response.arrayBuffer());
  return { data, contentType };
}

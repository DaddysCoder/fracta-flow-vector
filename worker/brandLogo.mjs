/** Pure helpers for the Brand Profile logo upload, split out from
 * index.js so they're unit-testable without mocking D1/R2 bindings —
 * same convention as entitlements.mjs. */

export const ALLOWED_LOGO_CONTENT_TYPES = ["image/png", "image/jpeg"];

/** Matches what `docx`'s ImageRun can actually embed (jpg/png/gif/bmp) —
 * keep this in sync with ALLOWED_LOGO_CONTENT_TYPES so an uploaded logo
 * is always usable in DOCX exports, never just in the browser preview. */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Never trust a client-supplied filename as the object key — derive a
 * stable, account-scoped key from the authenticated account id only, so
 * replacing a logo overwrites the same object instead of accumulating
 * orphaned uploads. */
export function brandLogoObjectKey(accountId) {
  return `brand-logos/${accountId}`;
}

export function validateLogoUpload(contentType, byteLength) {
  if (!ALLOWED_LOGO_CONTENT_TYPES.includes(contentType)) {
    return { ok: false, error: "unsupported_logo_type" };
  }
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    return { ok: false, error: "empty_logo" };
  }
  if (byteLength > MAX_LOGO_BYTES) {
    return { ok: false, error: "logo_too_large" };
  }
  return { ok: true };
}

import { describe, expect, it } from "vitest";
import { brandLogoObjectKey, MAX_LOGO_BYTES, validateLogoUpload } from "../brandLogo.mjs";

describe("brandLogoObjectKey", () => {
  it("derives the object key from the account id only, never a filename", () => {
    expect(brandLogoObjectKey("acct_123")).toBe("brand-logos/acct_123");
  });

  it("is stable across calls, so replacing a logo overwrites the same object", () => {
    expect(brandLogoObjectKey("acct_123")).toBe(brandLogoObjectKey("acct_123"));
  });
});

describe("validateLogoUpload", () => {
  it("accepts a PNG within the size limit", () => {
    expect(validateLogoUpload("image/png", 1024)).toEqual({ ok: true });
  });

  it("accepts a JPEG within the size limit", () => {
    expect(validateLogoUpload("image/jpeg", 1024)).toEqual({ ok: true });
  });

  it("rejects content types docx can't embed (e.g. SVG, WEBP, GIF)", () => {
    expect(validateLogoUpload("image/svg+xml", 1024)).toEqual({ ok: false, error: "unsupported_logo_type" });
    expect(validateLogoUpload("image/webp", 1024)).toEqual({ ok: false, error: "unsupported_logo_type" });
    expect(validateLogoUpload("image/gif", 1024)).toEqual({ ok: false, error: "unsupported_logo_type" });
  });

  it("rejects an empty body", () => {
    expect(validateLogoUpload("image/png", 0)).toEqual({ ok: false, error: "empty_logo" });
  });

  it("rejects a file over the size limit", () => {
    expect(validateLogoUpload("image/png", MAX_LOGO_BYTES + 1)).toEqual({ ok: false, error: "logo_too_large" });
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateLogoUpload("image/png", MAX_LOGO_BYTES)).toEqual({ ok: true });
  });
});

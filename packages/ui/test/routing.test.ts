import { describe, expect, it } from "vitest";
import {
  isBlockedLegacyDocumentRoute,
  pathForPaidDocument,
  pathForPublicForm,
  publicFormFromPath,
  PUBLIC_FORM_ROUTES,
  resolveAppView,
} from "../src/routing.js";

describe("Vector public routes", () => {
  it("maps the three launch deep links", () => {
    expect(publicFormFromPath("/referral")).toBe("referral");
    expect(publicFormFromPath("/practitioner-triage")).toBe("triage");
    expect(publicFormFromPath("/source-consultation-register")).toBe("source");
  });

  it("maps support template routes", () => {
    expect(resolveAppView("/support-templates/behaviour-support-plan")).toEqual({
      kind: "support-template",
      templateId: "behaviour-support-plan",
    });
    expect(resolveAppView("/support-templates")).toEqual({ kind: "support-hub" });
  });

  it("blocks legacy document 04 routes from public shell", () => {
    expect(isBlockedLegacyDocumentRoute("/bsa")).toBe(true);
    expect(resolveAppView("/bsa")).toEqual({ kind: "public", form: "referral" });
  });

  it("normalises trailing slashes", () => {
    expect(publicFormFromPath("/referral/")).toBe("referral");
    expect(publicFormFromPath("/practitioner-triage/")).toBe("triage");
  });

  it("defaults unknown paths to referral", () => {
    expect(publicFormFromPath("/")).toBe("referral");
    expect(publicFormFromPath("/document-04")).toBe("referral");
    expect(publicFormFromPath("/bsa")).toBe("referral");
  });

  it("round-trips form ids to stable paths", () => {
    expect(pathForPublicForm("referral")).toBe(PUBLIC_FORM_ROUTES.referral);
    expect(pathForPublicForm("triage")).toBe(PUBLIC_FORM_ROUTES.triage);
    expect(pathForPublicForm("source")).toBe(PUBLIC_FORM_ROUTES.source);
  });

  it("maps the BSP Review / Change Addendum route (document 13)", () => {
    expect(resolveAppView("/bsp-review-addendum")).toEqual({
      kind: "paid-document",
      documentId: "bsp-review-addendum",
    });
    expect(pathForPaidDocument("bsp-review-addendum")).toBe("/bsp-review-addendum");
  });
});

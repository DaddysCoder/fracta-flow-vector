import { describe, expect, it } from "vitest";
import {
  pathForPublicForm,
  publicFormFromPath,
  PUBLIC_FORM_ROUTES,
} from "../src/routing.js";

describe("Vector public routes", () => {
  it("maps the three launch deep links", () => {
    expect(publicFormFromPath("/referral")).toBe("referral");
    expect(publicFormFromPath("/practitioner-triage")).toBe("triage");
    expect(publicFormFromPath("/source-consultation-register")).toBe("source");
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
});

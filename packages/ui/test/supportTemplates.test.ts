import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMPREHENSIVE_BSP_CONFIG,
  GENERIC_BSP_CONFIG,
  INTERIM_BSP_CONFIG,
} from "../src/support-templates/configs.js";
import { buildTemplateContext } from "../src/support-templates/prefill.js";
import { STORAGE_DISCLOSURE } from "../src/support-templates/storage.js";

describe("Support template configs", () => {
  it("does not gate Interim BSP on FBA, assessment or saved referral", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/support-templates/SupportTemplateWizard.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/fba\.approved|FBA gate|completed assessment prerequisite|saved Referral/i);
    expect(source).not.toMatch(/ArcSession|localStorage\.getItem\(['"]arc/i);

    const stepOne = INTERIM_BSP_CONFIG.steps(buildTemplateContext())[0]!;
    expect(stepOne.note).toMatch(/no prerequisite assessment or saved referral required/i);
    expect(stepOne.text?.some((f) => f.label.includes("engagement date"))).toBe(true);
    expect(stepOne.text?.some((f) => f.label.includes("assessment / first meeting"))).toBe(false);
  });

  it("uses engagement-date wording and one-month RRP timing for Interim BSP", () => {
    const stepOne = INTERIM_BSP_CONFIG.steps(buildTemplateContext())[0]!;
    const engaged = stepOne.text?.find((f) => f.key === "dateEngaged");
    const due = stepOne.text?.find((f) => f.key === "dateReplace");
    expect(engaged?.label).toContain("engagement date");
    expect(due?.label).toMatch(/within 1 month of provider engagement/i);
  });

  it("does not require a saved Interim before Comprehensive and includes assessment basis", () => {
    const withoutInterim = COMPREHENSIVE_BSP_CONFIG.steps({ referral: {}, interim: null, hasInterim: false });
    expect(withoutInterim.some((s) => s.kind === "diff")).toBe(false);
    expect(withoutInterim[0]?.text?.some((f) => f.key === "assessmentBasis")).toBe(true);
  });

  it("describes generic BSP as non-Commission template with good-practice timing", () => {
    expect(GENERIC_BSP_CONFIG.completionNote).toMatch(/not a third formal NDIS Commission BSP type/i);
    const stepOne = GENERIC_BSP_CONFIG.steps(buildTemplateContext())[0]!;
    expect(stepOne.note).toMatch(/good practice/i);
    expect(stepOne.text?.find((f) => f.key === "dateReplace")?.label).toMatch(/good practice/i);
  });

  it("discloses session storage and never syncs template payloads server-side", () => {
    expect(STORAGE_DISCLOSURE).toMatch(/session storage/i);
    const storage = readFileSync(
      resolve(import.meta.dirname, "../src/support-templates/storage.ts"),
      "utf8",
    );
    const wizard = readFileSync(
      resolve(import.meta.dirname, "../src/support-templates/SupportTemplateWizard.tsx"),
      "utf8",
    );
    expect(storage).toMatch(/sessionStorage/);
    expect(wizard).not.toMatch(/fetch\(|\/api\//);
  });
});

describe("Support template routing", () => {
  it("maps paid template deep links", () => {
    const routing = readFileSync(resolve(import.meta.dirname, "../src/routing.ts"), "utf8");
    expect(routing).toMatch(/support-templates\/behaviour-support-plan/);
    expect(routing).toMatch(/support-templates\/interim-behaviour-support-plan/);
    expect(routing).toMatch(/support-templates\/comprehensive-behaviour-support-plan/);
  });

  it("blocks legacy Document 04 public routes", () => {
    const routing = readFileSync(resolve(import.meta.dirname, "../src/routing.ts"), "utf8");
    expect(routing).toMatch(/isBlockedLegacyDocumentRoute/);
    expect(routing).toMatch(/\/bsa/);
  });
});

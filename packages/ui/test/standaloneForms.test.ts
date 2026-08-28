import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("TriageForm standalone launch", () => {
  it("defaults to an empty referral task so triage opens without Referral", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/TriageForm.tsx"), "utf8");
    expect(source).toMatch(/task\?: TriageTask/);
    expect(source).toMatch(/task = EMPTY_TRIAGE_TASK/);
    expect(source).toMatch(/CAPABILITIES\.standalone/);
  });
});

describe("SourceForm standalone launch", () => {
  it("accepts empty prior fields for standalone use", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/SourceForm.tsx"), "utf8");
    expect(source).toMatch(/priorFields: FieldEntry\[\]/);
    expect(source).toMatch(/CAPABILITIES\.standalone/);
  });
});

describe("ReferralForm local completion copy", () => {
  it("uses truthful local-only completion wording", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/ReferralForm.tsx"), "utf8");
    expect(source).toMatch(/Referral complete/);
    expect(source).not.toMatch(/Referral submitted/);
    expect(source).toMatch(/browser session only/);
  });
});

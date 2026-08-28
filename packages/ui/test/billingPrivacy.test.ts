import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Vector billing client privacy", () => {
  it("never posts clinical form payloads through commercial helpers", () => {
    const billing = readFileSync(
      resolve(import.meta.dirname, "../src/commercial/billing.ts"),
      "utf8",
    );
    expect(billing).not.toMatch(/participant|clinical|formValues|FieldEntry/i);
    expect(billing).toMatch(/feature: feature \?\? null/);
  });

  it("limits brand profile saves to organisation metadata fields", () => {
    const billing = readFileSync(
      resolve(import.meta.dirname, "../src/commercial/billing.ts"),
      "utf8",
    );
    expect(billing).toMatch(/\/api\/brand-profile/);
    expect(billing).not.toMatch(/ndis|participant\.name|source\.entry/i);
  });
});

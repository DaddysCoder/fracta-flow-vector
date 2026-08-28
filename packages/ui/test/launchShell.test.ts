import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Vector launch shell", () => {
  it("does not expose Document 04 in the public app shell", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/ReferralApp.tsx"), "utf8");
    expect(source).not.toMatch(/BsaForm/);
    expect(source).not.toMatch(/from\s+["'].*bsa/i);
  });

  it("wires exactly the three launch forms", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/ReferralApp.tsx"), "utf8");
    expect(source).toMatch(/ReferralForm/);
    expect(source).toMatch(/TriageForm/);
    expect(source).toMatch(/SourceForm/);
  });

  it("links back to WHATBIT from the shared shell header", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/ShellHeader.tsx"), "utf8");
    expect(source).toMatch(/WHATBIT_VECTOR_URL/);
  });

  it("uses Vector as the browser title", () => {
    const html = readFileSync(resolve(import.meta.dirname, "../index.html"), "utf8");
    expect(html).toContain("<title>Vector</title>");
    expect(html).not.toMatch(/Fracta Flow/i);
  });
});

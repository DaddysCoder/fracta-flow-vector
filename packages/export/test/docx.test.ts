import { registry } from "@pbs/registry";
import { describe, expect, it } from "vitest";
import { FRACTA_FLOW_BRAND } from "../src/brand.js";
import { renderBlankDocx, renderCompletedDocx } from "../src/docx.js";

const REFERRAL = registry.documents["01"];
if (!REFERRAL) throw new Error('registry is missing document "01"');
const REFERRAL_FIELDS = registry.fields.filter((f) => REFERRAL.sections.some((s) => s.id === f.askedIn));

function isDocxZip(buffer: Buffer): boolean {
  // DOCX is a zip archive — "PK\x03\x04" is the local file header signature.
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

describe("renderBlankDocx", () => {
  it("produces a valid, Fracta-Flow-branded docx zip archive", async () => {
    const buffer = await renderBlankDocx(REFERRAL, "01", REFERRAL_FIELDS, FRACTA_FLOW_BRAND);
    expect(isDocxZip(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

describe("renderCompletedDocx", () => {
  it("produces a valid docx zip archive that differs from the blank one", async () => {
    const blank = await renderBlankDocx(REFERRAL, "01", REFERRAL_FIELDS, FRACTA_FLOW_BRAND);
    const completed = await renderCompletedDocx(REFERRAL, "01", REFERRAL_FIELDS, FRACTA_FLOW_BRAND, {
      "participant.preferred_name": "Sam",
      "referral.reason": "Escalating exit-seeking behaviour.",
    });
    expect(isDocxZip(completed)).toBe(true);
    expect(completed.equals(blank)).toBe(false);
  });
});

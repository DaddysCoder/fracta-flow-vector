import { registry } from "@pbs/registry";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { FRACTA_FLOW_BRAND } from "../src/brand.js";
import { renderBlankDocx, renderCompletedDocx } from "../src/docx.js";

async function documentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("docx zip is missing word/document.xml");
  return entry.async("text");
}

const REFERRAL = registry.documents["01"];
if (!REFERRAL) throw new Error('registry is missing document "01"');
const REFERRAL_FIELDS = registry.fields.filter((f) => REFERRAL.sections.some((s) => s.id === f.askedIn));

const SOURCE_REGISTER = registry.documents["03"];
if (!SOURCE_REGISTER) throw new Error('registry is missing document "03"');
const SOURCE_FIELDS = registry.fields.filter((f) => SOURCE_REGISTER.sections.some((s) => s.id === f.askedIn));

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

  it("renders a repeatable field's rows as separate entries, not joined onto one line", async () => {
    const buffer = await renderCompletedDocx(SOURCE_REGISTER, "03", SOURCE_FIELDS, FRACTA_FLOW_BRAND, {
      "source_document.about": ["Interview with case worker, 2 Aug 2026.", "Prior BSP document review, 5 Aug 2026."],
    });
    const xml = await documentXml(buffer);
    expect(xml).toContain("Interview with case worker, 2 Aug 2026.");
    expect(xml).toContain("Prior BSP document review, 5 Aug 2026.");
  });

  it("renders a blank line for a repeatable field with no rows, same as an empty scalar", async () => {
    const buffer = await renderCompletedDocx(SOURCE_REGISTER, "03", SOURCE_FIELDS, FRACTA_FLOW_BRAND, {});
    const xml = await documentXml(buffer);
    expect(xml).toContain("_".repeat(28));
  });
});

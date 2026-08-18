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
      "source.entry": ["Interview with case worker, 2 Aug 2026.", "Prior BSP document review, 5 Aug 2026."],
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

/**
 * Blank and completed exports must exist for all nine documents, not
 * only the ones with fields of their own. Documents 07 and 09 are
 * assembly documents — they ask almost nothing and are built from values
 * quoted out of earlier documents — so an export that only walked
 * `askedIn` fields would emit a title page and nothing else for them.
 */
describe("every one of the nine documents exports blank and completed", () => {
  const documentIds = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];

  for (const documentId of documentIds) {
    const doc = registry.documents[documentId];
    if (!doc) throw new Error(`registry is missing document "${documentId}"`);
    const sections = doc.sections.map((s) => s.id);
    const asked = registry.fields.filter((f) => sections.includes(f.askedIn));
    const quoted = registry.fields.filter(
      (f) => !sections.includes(f.askedIn) && f.rendersIn.some((s) => sections.includes(s)),
    );

    it(`renders document ${documentId} (${doc.title}) blank, with every section it owns`, async () => {
      const buffer = await renderBlankDocx(doc, documentId, asked, FRACTA_FLOW_BRAND, quoted);
      expect(isDocxZip(buffer)).toBe(true);
      const xml = await documentXml(buffer);
      expect(xml).toContain(doc.title);
      expect(xml).toContain(FRACTA_FLOW_BRAND.name);
      // Every section carrying content is printed, none silently dropped.
      for (const section of doc.sections) {
        const hasContent =
          asked.some((f) => f.askedIn === section.id) ||
          quoted.some((f) => f.rendersIn.includes(section.id));
        if (hasContent) expect(xml).toContain(section.title);
      }
    });

    it(`renders document ${documentId} completed, differing from its blank`, async () => {
      const values: Record<string, unknown> = {};
      for (const field of asked) values[field.id] = field.repeatable ? ["A recorded row"] : "A recorded answer";
      const quotedValues: Record<string, unknown> = {};
      for (const field of quoted) quotedValues[field.id] = "A quoted answer";

      const blank = await renderBlankDocx(doc, documentId, asked, FRACTA_FLOW_BRAND, quoted);
      const completed = await renderCompletedDocx(
        doc,
        documentId,
        asked,
        FRACTA_FLOW_BRAND,
        values,
        quoted,
        quotedValues,
      );
      expect(isDocxZip(completed)).toBe(true);
      expect(completed.equals(blank)).toBe(false);
      const xml = await documentXml(completed);
      if (asked.some((f) => !f.repeatable)) expect(xml).toContain("A recorded answer");
      if (asked.some((f) => f.repeatable)) expect(xml).toContain("A recorded row");
      if (quoted.length > 0) expect(xml).toContain("A quoted answer");
    });
  }

  it("prints a quoted field with no value as 'Not yet available' rather than blank", async () => {
    const doc = registry.documents["07"]!;
    const sections = doc.sections.map((s) => s.id);
    const quoted = registry.fields.filter(
      (f) => !sections.includes(f.askedIn) && f.rendersIn.some((s) => sections.includes(s)),
    );
    const buffer = await renderBlankDocx(doc, "07", [], FRACTA_FLOW_BRAND, quoted);
    const xml = await documentXml(buffer);
    expect(xml).toContain("Not yet available");
  });
});

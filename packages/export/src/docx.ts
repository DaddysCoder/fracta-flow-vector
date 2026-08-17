import type { DocumentDef, FieldDef } from "@pbs/registry";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { Brand } from "./brand.js";

const BLANK_LINE = "_".repeat(28);

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return BLANK_LINE;
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : BLANK_LINE;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface RenderDocxInput {
  document: DocumentDef;
  documentId: string;
  /** Fields askedIn one of this document's own sections, in section order. */
  fields: FieldDef[];
  brand: Brand;
  /** Omit for a blank template; pass answers for a completed export. */
  values?: Record<string, unknown>;
}

/**
 * Builds the document model (blank template, or completed with
 * `values`) straight from its registry section list — the same
 * section/field order the on-screen form uses, so print and DOCX never
 * drift from what the practitioner actually saw. Packing to bytes is a
 * separate step (see renderDocumentDocxBuffer/Blob) since Node and the
 * browser need different output types.
 */
export function buildDocxDocument(input: RenderDocxInput): Document {
  const { document, documentId, fields, brand, values } = input;

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: brand.name, bold: true, color: brand.accent, size: 20 })],
    }),
    new Paragraph({
      text: `${documentId} — ${document.title}`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: values ? "Completed" : "Blank template", italics: true, color: brand.ink }),
      ],
      alignment: AlignmentType.LEFT,
    }),
  ];

  for (const section of document.sections) {
    const sectionFields = fields.filter((f) => f.askedIn === section.id);
    if (sectionFields.length === 0) continue;

    children.push(
      new Paragraph({
        text: `${section.id}  ${section.title}`,
        heading: HeadingLevel.HEADING_1,
      }),
    );

    for (const field of sectionFields) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: field.label, bold: true })] }),
        new Paragraph({ text: formatValue(values?.[field.id]) }),
      );
    }
  }

  return new Document({ sections: [{ children }] });
}

/** Node-side rendering (tests, server-side generation). */
export function renderDocumentDocx(input: RenderDocxInput): Promise<Buffer> {
  return Packer.toBuffer(buildDocxDocument(input));
}

export function renderBlankDocx(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
): Promise<Buffer> {
  return renderDocumentDocx({ document, documentId, fields, brand });
}

export function renderCompletedDocx(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
  values: Record<string, unknown>,
): Promise<Buffer> {
  return renderDocumentDocx({ document, documentId, fields, brand, values });
}

/** Browser-side rendering — no Node Buffer involved, safe inside a
 * standalone client app with no server round-trip. */
export function renderDocumentDocxBlob(input: RenderDocxInput): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(input));
}

export function renderBlankDocxBlob(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
): Promise<Blob> {
  return renderDocumentDocxBlob({ document, documentId, fields, brand });
}

export function renderCompletedDocxBlob(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
  values: Record<string, unknown>,
): Promise<Blob> {
  return renderDocumentDocxBlob({ document, documentId, fields, brand, values });
}

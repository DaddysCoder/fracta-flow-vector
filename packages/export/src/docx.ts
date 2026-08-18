import type { DocumentDef, FieldDef } from "@pbs/registry";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { Brand } from "./brand.js";

const BLANK_LINE = "_".repeat(28);
const NOT_YET_AVAILABLE = "Not yet available";

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
  /**
   * Fields quoted into this document from elsewhere (registry `rendersIn`
   * only — not asked here). Rendered read-only, in section order, the
   * same way `FormRenderer` shows them on screen.
   *
   * Without these, an assembly document — the No-RP BSP (07) and the
   * Comprehensive BSP (09) ask almost nothing of their own — would export
   * as a title page and nothing else.
   */
  quotedFields?: FieldDef[];
  /** Resolved values for `quotedFields`, keyed by field id. A field with
   * no value prints "Not yet available", never a blank. */
  quotedValues?: Record<string, unknown>;
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
  const quoted = input.quotedFields ?? [];
  const quotedValues = input.quotedValues ?? {};

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
    const sectionQuoted = quoted.filter((f) => f.rendersIn.includes(section.id));
    if (sectionFields.length === 0 && sectionQuoted.length === 0) continue;

    children.push(
      new Paragraph({
        text: `${section.id}  ${section.title}`,
        heading: HeadingLevel.HEADING_1,
      }),
    );

    for (const field of sectionQuoted) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${field.label} (from elsewhere)`, bold: true })],
        }),
      );
      const value = quotedValues[field.id];
      children.push(
        new Paragraph({
          text:
            value === undefined || value === null || value === ""
              ? NOT_YET_AVAILABLE
              : formatValue(value),
        }),
      );
    }

    for (const field of sectionFields) {
      children.push(new Paragraph({ children: [new TextRun({ text: field.label, bold: true })] }));

      // A repeatable field's value is one entry per row (see
      // flattenValuesForExport in @pbs/ui) — each row gets its own
      // paragraph rather than being joined onto one line, since rows are
      // independent register/behaviour entries, not a short multi-select.
      if (field.repeatable) {
        const rows = (values?.[field.id] as unknown[] | undefined) ?? [];
        if (rows.length === 0) {
          children.push(new Paragraph({ text: BLANK_LINE }));
        } else {
          rows.forEach((row, i) => children.push(new Paragraph({ text: `${i + 1}. ${formatValue(row)}` })));
        }
      } else {
        children.push(new Paragraph({ text: formatValue(values?.[field.id]) }));
      }
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
  quotedFields: FieldDef[] = [],
): Promise<Buffer> {
  return renderDocumentDocx({ document, documentId, fields, brand, quotedFields });
}

export function renderCompletedDocx(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
  values: Record<string, unknown>,
  quotedFields: FieldDef[] = [],
  quotedValues: Record<string, unknown> = {},
): Promise<Buffer> {
  return renderDocumentDocx({ document, documentId, fields, brand, values, quotedFields, quotedValues });
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
  quotedFields: FieldDef[] = [],
): Promise<Blob> {
  return renderDocumentDocxBlob({ document, documentId, fields, brand, quotedFields });
}

export function renderCompletedDocxBlob(
  document: DocumentDef,
  documentId: string,
  fields: FieldDef[],
  brand: Brand,
  values: Record<string, unknown>,
  quotedFields: FieldDef[] = [],
  quotedValues: Record<string, unknown> = {},
): Promise<Blob> {
  return renderDocumentDocxBlob({
    document,
    documentId,
    fields,
    brand,
    values,
    quotedFields,
    quotedValues,
  });
}

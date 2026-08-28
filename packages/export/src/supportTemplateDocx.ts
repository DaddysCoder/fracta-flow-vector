import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import type { Brand } from "./brand.js";

const BLANK = "____________________________";

export interface SupportTemplateDocxSection {
  title: string;
  lines: string[];
}

export interface SupportTemplateDocxInput {
  eyebrow: string;
  brand: Brand;
  sections: SupportTemplateDocxSection[];
}

function line(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : BLANK;
}

function brandLogoParagraphs(brand: Brand): Paragraph[] {
  if (!brand.logo) return [];
  return [
    new Paragraph({
      children: [
        new ImageRun({
          type: brand.logo.type,
          data: brand.logo.data,
          transformation: { width: brand.logo.width, height: brand.logo.height },
        }),
      ],
    }),
  ];
}

export function buildSupportTemplateDocx(input: SupportTemplateDocxInput): Document {
  const children: Paragraph[] = [
    ...brandLogoParagraphs(input.brand),
    new Paragraph({
      children: [new TextRun({ text: input.brand.name, bold: true, color: input.brand.accent, size: 20 })],
    }),
    new Paragraph({ text: input.eyebrow, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: "Completed plan", italics: true })] }),
  ];

  for (const section of input.sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
    for (const text of section.lines) {
      children.push(new Paragraph({ text }));
    }
  }

  return new Document({ sections: [{ children }] });
}

export async function renderSupportTemplateDocxBlob(input: SupportTemplateDocxInput): Promise<Blob> {
  return Packer.toBlob(buildSupportTemplateDocx(input));
}

export async function renderSupportTemplateBlankDocxBlob(eyebrow: string, brand: Brand): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        children: [
          ...brandLogoParagraphs(brand),
          new Paragraph({
            children: [new TextRun({ text: brand.name, bold: true, color: brand.accent, size: 20 })],
          }),
          new Paragraph({ text: `${eyebrow} — Blank template`, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: "Complete this template in Vector to generate a filled plan." }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function formatSupportTemplateLine(value: string | undefined): string {
  return line(value);
}

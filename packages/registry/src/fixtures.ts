import type { DocumentDefinition, FieldDefinition, RegisterEntry, Registry } from "./types.js";

/**
 * Fixture domain: a benefits-application case. An applicant has previously
 * submitted an intake form, a financial declaration, and a dependents
 * schedule. Those documents' field values are candidates for prefilling
 * a new benefit-application document.
 */

const fields: FieldDefinition[] = [
  {
    id: "applicantName",
    label: "Applicant name",
    repeatable: false,
    stalenessDays: 365,
    informs: [],
  },
  {
    id: "dateOfBirth",
    label: "Date of birth",
    repeatable: false,
    stalenessDays: 3650,
    informs: [],
  },
  {
    id: "address",
    label: "Current address",
    repeatable: false,
    stalenessDays: 90,
    informs: [],
  },
  {
    id: "income",
    label: "Monthly income",
    repeatable: false,
    stalenessDays: 30,
    // An income figure is transcribed off a bank statement, so its
    // presence is evidence that the account number is discoverable too.
    informs: ["bankAccountNumber"],
  },
  {
    id: "bankAccountNumber",
    label: "Bank account number",
    repeatable: false,
    stalenessDays: 180,
    informs: [],
  },
  {
    id: "assets",
    label: "Assets",
    repeatable: true,
    stalenessDays: 30,
    informs: [],
  },
  {
    id: "dependents",
    label: "Dependents",
    repeatable: true,
    stalenessDays: 180,
    informs: [],
  },
];

const documents: DocumentDefinition[] = [
  {
    id: "intake",
    label: "Intake form",
    fields: ["applicantName", "dateOfBirth", "address"],
  },
  {
    id: "financial-declaration",
    label: "Financial declaration",
    fields: ["applicantName", "address", "income", "assets"],
  },
  {
    id: "dependents-schedule",
    label: "Dependents schedule",
    fields: ["applicantName", "dependents"],
  },
  {
    id: "benefit-application",
    label: "Benefit application",
    fields: [
      "applicantName",
      "dateOfBirth",
      "address",
      "income",
      "bankAccountNumber",
      "assets",
      "dependents",
    ],
  },
];

const registerEntries: RegisterEntry[] = [
  {
    id: "reg-financial-declaration",
    documentId: "financial-declaration",
    label: "Financial Declaration (on file)",
    fieldIds: ["income", "assets", "bankAccountNumber"],
  },
  {
    id: "reg-bank-verification-letter",
    documentId: "bank-verification-letter",
    label: "Bank Verification Letter",
    fieldIds: ["bankAccountNumber"],
  },
];

export const registry: Registry = {
  fields: Object.fromEntries(fields.map((field) => [field.id, field])),
  documents: Object.fromEntries(documents.map((doc) => [doc.id, doc])),
  registerEntries,
};

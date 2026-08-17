import { registry } from "@pbs/registry";
import type { CaseRecord, FieldEntry, FieldSchema, TargetDocument } from "../src/types.js";

export function toFieldSchema(fieldId: string): FieldSchema {
  const def = registry.fields[fieldId];
  if (!def) throw new Error(`Unknown fixture field "${fieldId}"`);
  return {
    fieldId: def.id,
    repeatable: def.repeatable,
    stalenessDays: def.stalenessDays,
    informs: def.informs,
  };
}

export function toTargetDocument(documentTypeId: string, instanceId: string): TargetDocument {
  const doc = registry.documents[documentTypeId];
  if (!doc) throw new Error(`Unknown fixture document "${documentTypeId}"`);
  return {
    id: instanceId,
    type: doc.id,
    fields: doc.fields.map(toFieldSchema),
  };
}

export const TARGET_INSTANCE_ID = "app-1";
export const TARGET = toTargetDocument("benefit-application", TARGET_INSTANCE_ID);

/**
 * A case with three prior documents (intake, financial declaration,
 * dependents schedule) plus a couple of values already authored directly
 * in the in-progress benefit-application (app-1) — enough to exercise
 * every tier:
 *
 *  - applicantName: authored locally in app-1 (tier0), even though an
 *    older intake-1 value also exists (must be ignored, local wins).
 *  - dateOfBirth: only ever on intake-1 (tier1 candidate).
 *  - address: on both intake-1 (older) and financial-declaration-1
 *    (newer) — the newer one must win (tier1 candidate).
 *  - income: only on financial-declaration-1 (tier1 candidate; staleness
 *    depends on `now`, exercised via table-driven cases).
 *  - assets: repeatable. asset-1 exists both on financial-declaration-1
 *    and locally in app-1 (local wins, tier0); asset-2 only exists on
 *    financial-declaration-1 (tier2 candidate).
 *  - dependents: repeatable, only ever on dependents-schedule-1 (tier2).
 *  - bankAccountNumber: nowhere (tier3), evidenced by the income field
 *    (`informs`) and by two register entries.
 */
export function buildFields(): FieldEntry[] {
  return [
    {
      fieldId: "applicantName",
      value: "Jordan Lee",
      sourceDocument: "intake-1",
      sourceDate: "2025-01-10",
    },
    {
      fieldId: "applicantName",
      value: "Jordan A. Lee",
      sourceDocument: TARGET_INSTANCE_ID,
      sourceDate: "2026-08-15",
    },
    {
      fieldId: "dateOfBirth",
      value: "1990-05-02",
      sourceDocument: "intake-1",
      sourceDate: "2025-01-10",
    },
    {
      fieldId: "address",
      value: "12 Main St",
      sourceDocument: "intake-1",
      sourceDate: "2025-01-10",
    },
    {
      fieldId: "address",
      value: "99 New Ave",
      sourceDocument: "financial-declaration-1",
      sourceDate: "2026-08-01",
    },
    {
      fieldId: "income",
      value: 5000,
      sourceDocument: "financial-declaration-1",
      sourceDate: "2026-07-20",
    },
    {
      fieldId: "assets",
      rowId: "asset-uuid-1",
      value: { description: "Savings account", amount: 5000 },
      sourceDocument: "financial-declaration-1",
      sourceDate: "2026-07-20",
    },
    {
      fieldId: "assets",
      rowId: "asset-uuid-1",
      value: { description: "Savings account", amount: 5200 },
      sourceDocument: TARGET_INSTANCE_ID,
      sourceDate: "2026-08-10",
    },
    {
      fieldId: "assets",
      rowId: "asset-uuid-2",
      value: { description: "Car", amount: 8000 },
      sourceDocument: "financial-declaration-1",
      sourceDate: "2026-07-20",
    },
    {
      fieldId: "dependents",
      rowId: "dep-uuid-1",
      value: { name: "Alex Lee", dob: "2015-03-01" },
      sourceDocument: "dependents-schedule-1",
      sourceDate: "2025-01-15",
    },
  ];
}

export function buildRecord(): CaseRecord {
  return {
    fields: buildFields(),
    registerEntries: registry.registerEntries,
  };
}

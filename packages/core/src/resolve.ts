import { InvalidRowIdError, MissingProvenanceError } from "./errors.js";
import type {
  CaseRecord,
  Capabilities,
  EvidenceRef,
  FieldEntry,
  FieldSchema,
  ResolvedDocument,
  TargetDocument,
  Tier0Entry,
  Tier1Entry,
  Tier2Entry,
  Tier3Entry,
} from "./types.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function validateProvenance(fields: FieldEntry[]): void {
  fields.forEach((entry, index) => {
    if (!entry.sourceDocument || !entry.sourceDate) {
      throw new MissingProvenanceError(entry.fieldId, index);
    }
  });
}

function validateRowUsage(
  entries: FieldEntry[],
  schema: FieldSchema,
  startIndex: (entry: FieldEntry) => number,
): void {
  for (const entry of entries) {
    if (schema.repeatable && !entry.rowId) {
      throw new InvalidRowIdError(
        entry.fieldId,
        startIndex(entry),
        "belongs to a repeatable field but has no rowId",
      );
    }
    if (!schema.repeatable && entry.rowId) {
      throw new InvalidRowIdError(
        entry.fieldId,
        startIndex(entry),
        "is a scalar field but carries a rowId",
      );
    }
  }
}

/** Most recent entry by sourceDate; later array position wins ties. */
function latestOf(entries: FieldEntry[]): FieldEntry | undefined {
  return entries.reduce<FieldEntry | undefined>((latest, entry) => {
    if (!latest) return entry;
    return Date.parse(entry.sourceDate) >= Date.parse(latest.sourceDate) ? entry : latest;
  }, undefined);
}

/** Most recent entry per rowId — grouping is always keyed by rowId (a
 * uuid), never by position in the input array. */
function latestByRowId(entries: FieldEntry[]): Map<string, FieldEntry> {
  const byRow = new Map<string, FieldEntry[]>();
  for (const entry of entries) {
    const rowId = entry.rowId as string;
    const bucket = byRow.get(rowId);
    if (bucket) {
      bucket.push(entry);
    } else {
      byRow.set(rowId, [entry]);
    }
  }
  const result = new Map<string, FieldEntry>();
  for (const [rowId, bucket] of byRow) {
    const latest = latestOf(bucket);
    if (latest) result.set(rowId, latest);
  }
  return result;
}

function daysBetween(now: Date, sourceDate: string): number {
  return (now.getTime() - Date.parse(sourceDate)) / MS_PER_DAY;
}

function buildEvidence(
  fieldId: string,
  record: CaseRecord,
  targetDocument: TargetDocument,
): EvidenceRef[] {
  const evidence: EvidenceRef[] = [];

  for (const schema of targetDocument.fields) {
    if (!schema.informs.includes(fieldId)) continue;
    const entries = record.fields.filter((entry) => entry.fieldId === schema.fieldId);
    const latest = latestOf(entries);
    if (!latest) continue;
    evidence.push({
      kind: "field",
      fieldId: schema.fieldId,
      sourceDocument: latest.sourceDocument,
      sourceDate: latest.sourceDate,
    });
  }

  for (const registerEntry of record.registerEntries) {
    if (!registerEntry.fieldIds.includes(fieldId)) continue;
    evidence.push({
      kind: "register",
      registerEntryId: registerEntry.id,
      documentId: registerEntry.documentId,
      label: registerEntry.label,
    });
  }

  return evidence;
}

/**
 * Resolve field values for `targetDocument` out of everything known about
 * the case in `record`, tiered by how confidently they can be surfaced:
 *
 *  - tier0: authored directly in the target document. Render, never prompt.
 *  - tier1: a scalar value found in another document. Needs a batched
 *    confirm; flagged `stale` once it's older than the field's staleness
 *    policy allows.
 *  - tier2: a repeatable-group row carried from another document, one
 *    entry per row (keyed by rowId, never array index). Pre-ticked for
 *    bulk accept.
 *  - tier3: no value anywhere. Value is always null; evidence points at
 *    where one might be found instead.
 *
 * Pure: `now` is passed in rather than read from the system clock so the
 * same inputs always produce the same output.
 */
export function resolve(
  record: CaseRecord,
  targetDocument: TargetDocument,
  caps: Capabilities,
  now: Date,
): ResolvedDocument {
  validateProvenance(record.fields);

  const entriesByField = new Map<string, FieldEntry[]>();
  for (const entry of record.fields) {
    const bucket = entriesByField.get(entry.fieldId);
    if (bucket) bucket.push(entry);
    else entriesByField.set(entry.fieldId, [entry]);
  }

  const tier0: Tier0Entry[] = [];
  const tier1: Tier1Entry[] = [];
  const tier2: Tier2Entry[] = [];
  const tier3: Tier3Entry[] = [];

  const resolvedFieldIds = new Set<string>();
  const missingFieldIds: string[] = [];

  for (const schema of targetDocument.fields) {
    const entries = entriesByField.get(schema.fieldId) ?? [];
    validateRowUsage(entries, schema, (entry) => record.fields.indexOf(entry));

    const localEntries = entries.filter((entry) => entry.sourceDocument === targetDocument.id);
    const crossEntries = entries.filter((entry) => entry.sourceDocument !== targetDocument.id);

    if (schema.repeatable) {
      const localRows = latestByRowId(localEntries);
      let hasValue = localRows.size > 0;

      if (localRows.size > 0) {
        const rows = [...localRows.values()];
        const latestLocal = latestOf(rows);
        tier0.push({
          fieldId: schema.fieldId,
          value: rows.map((row) => ({ rowId: row.rowId, value: row.value })),
          sourceDocument: targetDocument.id,
          sourceDate: latestLocal!.sourceDate,
        });
      }

      if (caps.crossDocumentPrefill) {
        const crossRows = latestByRowId(crossEntries);
        for (const [rowId, entry] of crossRows) {
          if (localRows.has(rowId)) continue; // already authored locally
          hasValue = true;
          tier2.push({
            fieldId: schema.fieldId,
            rowId,
            value: entry.value,
            sourceDocument: entry.sourceDocument,
            proposed: "carry",
          });
        }
      }

      if (hasValue) resolvedFieldIds.add(schema.fieldId);
      else if (caps.crossDocumentPrefill) missingFieldIds.push(schema.fieldId);
      continue;
    }

    // Scalar field.
    if (localEntries.length > 0) {
      const latest = latestOf(localEntries)!;
      tier0.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDocument: latest.sourceDocument,
        sourceDate: latest.sourceDate,
      });
      resolvedFieldIds.add(schema.fieldId);
      continue;
    }

    if (caps.crossDocumentPrefill && crossEntries.length > 0) {
      const latest = latestOf(crossEntries)!;
      tier1.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDate: latest.sourceDate,
        stale: daysBetween(now, latest.sourceDate) > schema.stalenessDays,
      });
      resolvedFieldIds.add(schema.fieldId);
      continue;
    }

    if (caps.crossDocumentPrefill) missingFieldIds.push(schema.fieldId);
  }

  if (caps.crossDocumentPrefill) {
    for (const fieldId of missingFieldIds) {
      tier3.push({
        fieldId,
        value: null,
        evidence: buildEvidence(fieldId, record, targetDocument),
      });
    }
  }

  return { tier0, tier1, tier2, tier3 };
}

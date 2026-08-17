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
  indexOf: (entry: FieldEntry) => number,
): void {
  for (const entry of entries) {
    if (schema.repeatable && !entry.rowId) {
      throw new InvalidRowIdError(
        entry.fieldId,
        indexOf(entry),
        "belongs to a repeatable field but has no rowId",
      );
    }
    if (!schema.repeatable && entry.rowId) {
      throw new InvalidRowIdError(
        entry.fieldId,
        indexOf(entry),
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
    if (bucket) bucket.push(entry);
    else byRow.set(rowId, [entry]);
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

function intersects(a: string[], b: string[]): boolean {
  return a.some((x) => b.includes(x));
}

/** Field is asked directly within this document's own sections. */
function isAuthoredHere(schema: FieldSchema, doc: TargetDocument): boolean {
  return doc.sections.includes(schema.section);
}

/** Field's value is reused/quoted within this document, via cross-reference. */
function isRenderedHere(schema: FieldSchema, doc: TargetDocument): boolean {
  return intersects(schema.rendersIn, doc.sections);
}

/**
 * Evidence for a tier3 field being freshly authored at `schema.section`:
 * every other field (of any tier) whose `informs` includes that section,
 * plus every row ever recorded against the case's source/consultation
 * register — regardless of whether that register's own `informs` lists
 * this section, since the register documents every source consulted for
 * the case and is always relevant background for a new interpretation.
 */
function buildEvidence(
  schema: FieldSchema,
  record: CaseRecord,
  allFields: FieldSchema[],
): EvidenceRef[] {
  const evidence: EvidenceRef[] = [];
  const seen = new Set<string>();

  const addFrom = (informant: FieldSchema) => {
    const entries = record.fields.filter((entry) => entry.fieldId === informant.fieldId);
    if (entries.length === 0) return;

    const rows = informant.repeatable ? [...latestByRowId(entries).values()] : [latestOf(entries)!];
    for (const row of rows) {
      const key = `${row.fieldId}:${row.rowId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push({
        fieldId: row.fieldId,
        ...(row.rowId ? { rowId: row.rowId } : {}),
        value: row.value,
        sourceDocument: row.sourceDocument,
        sourceDate: row.sourceDate,
      });
    }
  };

  for (const informant of allFields) {
    if (informant.informs.includes(schema.section) || informant.isCaseRegister) {
      addFrom(informant);
    }
  }

  return evidence;
}

/**
 * Resolve field values for `targetDocument` out of everything known about
 * the case in `record`, tiered by how confidently they can be surfaced.
 *
 * A field's tier is intrinsic (identity / perishable fact / observation /
 * interpretation), not inferred — but a value already authored directly
 * in the target document is always final and renders regardless of the
 * field's tier, and an interpretation (tier3) already finalized
 * elsewhere and merely quoted into this document (via `rendersIn`,
 * without being asked here) renders the same way rather than coming
 * back blank — only a tier3 field actually being asked *in* this
 * document is unconditionally blank:
 *
 *  - tier0: authored locally, or an identity fact carried from anywhere
 *    else in the case. Render, never prompt. Never stale.
 *  - tier1: a perishable fact found in another document. Needs a
 *    batched confirm; flagged `stale` once older than the field's
 *    staleness policy allows.
 *  - tier2: an observation — a repeatable-group row (keyed by rowId,
 *    never array index) or a scalar value — carried from another
 *    document. Pre-ticked for bulk accept.
 *  - tier3: an interpretation being freshly authored in this document.
 *    Value is always null; evidence points at informing fields and the
 *    case's source register instead.
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

  for (const schema of targetDocument.fields) {
    const authoredHere = isAuthoredHere(schema, targetDocument);
    const renderedHere = isRenderedHere(schema, targetDocument);
    if (!authoredHere && !renderedHere) continue; // not in scope for this document

    // A tier3 field being asked here is always freshly authored — never
    // prefilled, regardless of any prior value anywhere.
    if (schema.tier === 3 && authoredHere) {
      if (caps.crossDocumentPrefill) {
        tier3.push({
          fieldId: schema.fieldId,
          value: null,
          evidence: buildEvidence(schema, record, targetDocument.fields),
        });
      }
      continue;
    }

    // An interpretation already finalized elsewhere and merely quoted
    // here (rendersIn only) behaves like tier0: render, never re-author.
    const effectiveTier = schema.tier === 3 ? 0 : schema.tier;

    const entries = entriesByField.get(schema.fieldId) ?? [];
    validateRowUsage(entries, schema, (entry) => record.fields.indexOf(entry));
    const localEntries = entries.filter((entry) => entry.sourceDocument === targetDocument.id);
    const crossEntries = entries.filter((entry) => entry.sourceDocument !== targetDocument.id);

    if (schema.repeatable && effectiveTier !== 1) {
      const localRows = latestByRowId(localEntries);
      const crossRows = caps.crossDocumentPrefill ? latestByRowId(crossEntries) : new Map();

      if (effectiveTier === 0) {
        const rows = new Map(localRows);
        for (const [rowId, entry] of crossRows) if (!rows.has(rowId)) rows.set(rowId, entry);
        if (rows.size > 0) {
          const values = [...rows.values()];
          const latest = latestOf(values)!;
          tier0.push({
            fieldId: schema.fieldId,
            value: values.map((row) => ({ rowId: row.rowId, value: row.value })),
            sourceDocument: localRows.size > 0 ? targetDocument.id : latest.sourceDocument,
            sourceDate: latest.sourceDate,
          });
        }
      } else {
        // effectiveTier === 2
        if (localRows.size > 0) {
          const rows = [...localRows.values()];
          tier0.push({
            fieldId: schema.fieldId,
            value: rows.map((row) => ({ rowId: row.rowId, value: row.value })),
            sourceDocument: targetDocument.id,
            sourceDate: latestOf(rows)!.sourceDate,
          });
        }
        for (const [rowId, entry] of crossRows) {
          if (localRows.has(rowId)) continue;
          tier2.push({
            fieldId: schema.fieldId,
            rowId,
            value: entry.value,
            sourceDocument: entry.sourceDocument,
            proposed: "carry",
          });
        }
      }
      continue;
    }

    // Scalar path (also used as a degenerate fallback for the
    // unrepresented repeatable-tier1 combination: the real registry
    // never pairs tier1 with repeatable, so rows collapse to "most
    // recent entry overall" rather than being tracked per rowId).
    if (localEntries.length > 0) {
      const latest = latestOf(localEntries)!;
      tier0.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDocument: latest.sourceDocument,
        sourceDate: latest.sourceDate,
      });
      continue;
    }

    if (!caps.crossDocumentPrefill || crossEntries.length === 0) continue;

    const latest = latestOf(crossEntries)!;
    if (effectiveTier === 0) {
      tier0.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDocument: latest.sourceDocument,
        sourceDate: latest.sourceDate,
      });
    } else if (effectiveTier === 1) {
      tier1.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDate: latest.sourceDate,
        stale: daysBetween(now, latest.sourceDate) > (schema.stalenessDays ?? Infinity),
      });
    } else {
      tier2.push({
        fieldId: schema.fieldId,
        value: latest.value,
        sourceDocument: latest.sourceDocument,
        proposed: "carry",
      });
    }
  }

  return { tier0, tier1, tier2, tier3 };
}

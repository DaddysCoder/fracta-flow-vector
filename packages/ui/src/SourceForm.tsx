import { CAPABILITIES, resolve, type CaseRecord, type FieldEntry } from "@pbs/core";
import { FRACTA_FLOW_BRAND, renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { flattenValuesForExport, FormRenderer, type FormValues } from "./FormRenderer.js";
import { toTargetDocument } from "./registryAdapter.js";
import { SOURCE_ALWAYS_REQUIRED_FIELD_IDS, SOURCE_DOCUMENT_ID, SOURCE_VISIBILITY_RULES } from "./source.js";
import { requiredFieldIds } from "./visibility.js";

const maybeSourceDocument = registry.documents[SOURCE_DOCUMENT_ID];
if (!maybeSourceDocument) throw new Error(`registry is missing document "${SOURCE_DOCUMENT_ID}"`);
const SOURCE_DOCUMENT: DocumentDef = maybeSourceDocument;

const SOURCE_FIELDS = registry.fields.filter((f) =>
  SOURCE_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

/** Fields quoted into this document from elsewhere (registry `rendersIn`
 * only — never authored here): the triaging practitioner's identity and
 * the document date. */
const SOURCE_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !SOURCE_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => SOURCE_DOCUMENT.sections.some((s) => s.id === section)),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function newRowId(): string {
  return crypto.randomUUID();
}

/** Flattens a repeatable group's rows into FieldEntry[], keyed by rowId —
 * never by array position. */
function flattenGroups(groups: Record<string, FormValues["groups"][string]>, sourceDocument: string, sourceDate: string): FieldEntry[] {
  const entries: FieldEntry[] = [];
  for (const rows of Object.values(groups)) {
    for (const row of rows) {
      for (const [fieldId, value] of Object.entries(row.values)) {
        entries.push({ fieldId, value, rowId: row.rowId, sourceDocument, sourceDate });
      }
    }
  }
  return entries;
}

export interface SourceResult {
  /** Every field known about the case so far, plus this register's own
   * entries — carried forward for document 04+. */
  caseFields: FieldEntry[];
}

export interface SourceFormProps {
  /** Everything known about the case up to this point — document 02's
   * fields plus everything document 01 answered before it, so this
   * register can quote the practitioner's identity back. */
  priorFields: FieldEntry[];
  /** Called once submission succeeds. This register never decides a
   * pathway or classification — it only records sources consulted. */
  onSubmitted: (result: SourceResult) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

export function SourceForm({ priorFields, onSubmitted, now = () => new Date() }: SourceFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = useMemo(
    () => requiredFieldIds(SOURCE_VISIBILITY_RULES, values.scalar, SOURCE_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const sourceId = "source-draft"; // one draft per session in this standalone build

  // Standalone (MD-005/MD-006), matching document 02: cross-document
  // prefill is locked off, so 03's quoted fields quote nothing across
  // documents. `ReadOnlyField` renders "Not yet available" for any
  // quoted field with no locally-recorded value, which is the correct
  // standalone answer, not a bug. See CONTRADICTIONS.md #5.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: priorFields };
    const targetDocument = toTargetDocument(SOURCE_DOCUMENT_ID, sourceId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.standalone, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [priorFields]);

  function handleDownloadBlank() {
    renderBlankDocxBlob(SOURCE_DOCUMENT, SOURCE_DOCUMENT_ID, SOURCE_FIELDS, FRACTA_FLOW_BRAND).then((blob) =>
      download(blob, "fracta-flow-source-register-blank.docx"),
    );
  }

  function handleDownloadCompleted() {
    renderCompletedDocxBlob(
      SOURCE_DOCUMENT,
      SOURCE_DOCUMENT_ID,
      SOURCE_FIELDS,
      FRACTA_FLOW_BRAND,
      flattenValuesForExport(values),
    ).then((blob) => download(blob, "fracta-flow-source-register-completed.docx"));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = [...required].filter((id) => {
      const v = values.scalar[id];
      return v === undefined || v === null || v === "";
    });
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    setMissingFields([]);

    const timestamp = now().toISOString();
    const scalarEntries: FieldEntry[] = Object.entries(values.scalar).map(([fieldId, value]) => ({
      fieldId,
      value,
      sourceDocument: sourceId,
      sourceDate: timestamp,
    }));
    const groupEntries = flattenGroups(values.groups, sourceId, timestamp);
    const caseFields = [...priorFields, ...scalarEntries, ...groupEntries];

    setSubmitted(true);
    onSubmitted({ caseFields });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Source and consultation register submitted</h1>
        <p>Every source and consultation logged above is carried forward with this case.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="no-print" style={{ marginBottom: "1.5rem" }}>
        <button type="button" onClick={handleDownloadBlank}>
          Download blank DOCX
        </button>{" "}
        <button type="button" onClick={handleDownloadCompleted}>
          Download completed DOCX
        </button>{" "}
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={SOURCE_DOCUMENT}
        fields={SOURCE_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={SOURCE_VISIBILITY_RULES}
        alwaysRequiredFieldIds={SOURCE_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
        quotedFields={SOURCE_QUOTED_FIELDS}
        quotedValues={quotedValues}
      />

      <button type="submit" className="primary no-print">
        Submit source register
      </button>
    </form>
  );
}

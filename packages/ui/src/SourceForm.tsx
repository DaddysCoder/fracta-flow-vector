import { CAPABILITIES, resolve, type CaseRecord, type FieldEntry } from "@pbs/core";
import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { ExportControls } from "./commercial/ExportControls.js";
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
        <h1>Source and consultation register complete</h1>
        <p>
          Your register entries remain in this browser session only. Nothing was uploaded or stored
          on WHATBIT servers. Use export or print if you want a copy outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(SOURCE_DOCUMENT, SOURCE_DOCUMENT_ID, SOURCE_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            SOURCE_DOCUMENT,
            SOURCE_DOCUMENT_ID,
            SOURCE_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-source-register-blank.docx"
        completedFilename="vector-source-register-completed.docx"
      />

      {/* Prototype shows this as its own eyebrow line, matching every
       * other document's "DOCUMENT 0N · TIER" mark — Source has no
       * wizard steps of its own, so there is no step suffix. */}
      <div className="wizard-eyebrow-row">
        <span className="wizard-eyebrow">DOCUMENT 03 · FREE</span>
      </div>

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      {/*
       * The design handoff's prototype shows Source split into two
       * bespoke sub-registers (03.A Document register with an
       * auto-detected type badge and duplicate-name warning, 03.B
       * Consultation log split into participant/others) — see
       * `Vector App Redesign (digital).dc.html`'s `isSource` block.
       * The registry (packages/registry/src/fields.json) has exactly one
       * section (03.1) and one repeatable free-text field
       * (`source.entry`), not the ~19 structured sub-fields that bespoke
       * layout would need. This gap was already flagged and deliberately
       * left unresolved — see CONTRADICTIONS.md #4 — rather than guessed
       * at here. What follows is the registry's actual single-section,
       * single-field shape, styled with the same card/token language as
       * every other screen so the *visual system* still matches even
       * though the *data model* doesn't yet support the richer layout.
       */}
      <div className="card">
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
      </div>

      <button type="submit" className="primary no-print" style={{ marginTop: "1.5rem" }}>
        Complete register
      </button>
    </form>
  );
}

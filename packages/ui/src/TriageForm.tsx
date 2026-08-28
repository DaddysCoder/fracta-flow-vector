import {
  CAPABILITIES,
  resolve,
  resolvePathway,
  type CaseRecord,
  type FieldEntry,
  type ResolvedPathway,
  type RrpClassification,
  type TriageTask,
} from "@pbs/core";
import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { ExportControls } from "./commercial/ExportControls.js";
import { flattenValuesForExport, FormRenderer, type FormValues } from "./FormRenderer.js";
import { toPathwayPermissions, toTargetDocument } from "./registryAdapter.js";
import { TRIAGE_ALWAYS_REQUIRED_FIELD_IDS, TRIAGE_DOCUMENT_ID, TRIAGE_VISIBILITY_RULES } from "./triage.js";
import { requiredFieldIds } from "./visibility.js";

const maybeTriageDocument = registry.documents[TRIAGE_DOCUMENT_ID];
if (!maybeTriageDocument) throw new Error(`registry is missing document "${TRIAGE_DOCUMENT_ID}"`);
const TRIAGE_DOCUMENT: DocumentDef = maybeTriageDocument;

const TRIAGE_FIELDS = registry.fields.filter((f) =>
  TRIAGE_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

/** Fields quoted into this document from elsewhere (registry `rendersIn`
 * only — never authored here). Section 02.A ("Referral review") and 02.G
 * ("Evidence currently available") exist purely to display these. */
const TRIAGE_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !TRIAGE_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => TRIAGE_DOCUMENT.sections.some((s) => s.id === section)),
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

export interface TriageResult {
  /** Every field known about the case so far — the referral's original
   * answers plus this triage's own — carried forward for document 03+. */
  caseFields: FieldEntry[];
  /** The pathway this triage's RRP classification resolves to, plus the
   * document permissions that classification carries. */
  resolvedPathway: ResolvedPathway;
}

export interface TriageFormProps {
  /** The referral's triage task — its `fields` become this case's starting
   * record, so document 02 can quote what document 01 already answered. */
  task: TriageTask;
  /** Called once submission succeeds. Practitioner triage is where the RRP
   * classification and pathway are decided — never inferred, never scored. */
  onSubmitted: (result: TriageResult) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

export function TriageForm({ task, onSubmitted, now = () => new Date() }: TriageFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = useMemo(
    () => requiredFieldIds(TRIAGE_VISIBILITY_RULES, values.scalar, TRIAGE_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const triageId = "triage-draft"; // one draft per session in this standalone build

  // Standalone (MD-005/MD-006): this form must open and complete on its
  // own, with no other tool's data assumed present. Cross-document
  // prefill is locked off, so 02.A/02.G quote nothing across documents;
  // `ReadOnlyField` renders "Not yet available" for any quoted field
  // with no locally-recorded value, which is the correct standalone
  // answer, not a bug. See CONTRADICTIONS.md #5.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: task.fields };
    const targetDocument = toTargetDocument(TRIAGE_DOCUMENT_ID, triageId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.standalone, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [task]);

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
      sourceDocument: triageId,
      sourceDate: timestamp,
    }));
    const groupEntries = flattenGroups(values.groups, triageId, timestamp);
    const caseFields = [...task.fields, ...scalarEntries, ...groupEntries];

    const classification = values.scalar["triage.rrp_status"] as RrpClassification;
    const resolvedPathway = resolvePathway(
      classification,
      toPathwayPermissions(classification),
      new Set(), // fba.approved cannot be set this early — the FBA (document 04) hasn't happened yet
    );

    setSubmitted(true);
    onSubmitted({ caseFields, resolvedPathway });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Practitioner triage submitted</h1>
        <p>
          The RRP classification and triage outcome recorded above are the practitioner's own judgement —
          nothing here was inferred or scored automatically.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(TRIAGE_DOCUMENT, TRIAGE_DOCUMENT_ID, TRIAGE_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            TRIAGE_DOCUMENT,
            TRIAGE_DOCUMENT_ID,
            TRIAGE_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-practitioner-triage-blank.docx"
        completedFilename="vector-practitioner-triage-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={TRIAGE_DOCUMENT}
        fields={TRIAGE_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={TRIAGE_VISIBILITY_RULES}
        alwaysRequiredFieldIds={TRIAGE_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
        quotedFields={TRIAGE_QUOTED_FIELDS}
        quotedValues={quotedValues}
      />

      <button type="submit" className="primary no-print">
        Submit triage
      </button>
    </form>
  );
}

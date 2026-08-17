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
import { FRACTA_FLOW_BRAND, renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { FormRenderer, type FormValues } from "./FormRenderer.js";
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

  // Cross-document prefill is required for 02.A/02.G to show anything at
  // all — this form is inherently the second step of one governed case,
  // never a standalone tool, so it runs under "connected" capabilities
  // regardless of what mode document 01 was completed under.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: task.fields };
    const targetDocument = toTargetDocument(TRIAGE_DOCUMENT_ID, triageId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.connected, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [task]);

  function handleDownloadBlank() {
    renderBlankDocxBlob(TRIAGE_DOCUMENT, TRIAGE_DOCUMENT_ID, TRIAGE_FIELDS, FRACTA_FLOW_BRAND).then((blob) =>
      download(blob, "fracta-flow-practitioner-triage-blank.docx"),
    );
  }

  function handleDownloadCompleted() {
    renderCompletedDocxBlob(
      TRIAGE_DOCUMENT,
      TRIAGE_DOCUMENT_ID,
      TRIAGE_FIELDS,
      FRACTA_FLOW_BRAND,
      values.scalar,
    ).then((blob) => download(blob, "fracta-flow-practitioner-triage-completed.docx"));
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

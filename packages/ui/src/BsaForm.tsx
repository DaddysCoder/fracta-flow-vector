import {
  CAPABILITIES,
  checkAuthoringGates,
  resolve,
  type CaseRecord,
  type FieldEntry,
  type GateViolation,
  type Pathway,
} from "@pbs/core";
import { FRACTA_FLOW_BRAND, renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { BSA_ALWAYS_REQUIRED_FIELD_IDS, BSA_DOCUMENT_ID, BSA_VISIBILITY_RULES } from "./bsa.js";
import { flattenValuesForExport, FormRenderer, type FormValues } from "./FormRenderer.js";
import { ProfessionalToolDisclaimer } from "./ProfessionalToolDisclaimer.js";
import { toTargetDocument } from "./registryAdapter.js";
import { requiredFieldIds } from "./visibility.js";

const maybeBsaDocument = registry.documents[BSA_DOCUMENT_ID];
if (!maybeBsaDocument) throw new Error(`registry is missing document "${BSA_DOCUMENT_ID}"`);
const BSA_DOCUMENT: DocumentDef = maybeBsaDocument;

const BSA_FIELDS = registry.fields.filter((f) => BSA_DOCUMENT.sections.some((s) => s.id === f.askedIn));

/** Fields quoted into this document from elsewhere (registry `rendersIn`
 * only — never authored here): participant/practitioner identity,
 * document date, guardian authority scope, communication needs, NDIS
 * plan dates. */
const BSA_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !BSA_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => BSA_DOCUMENT.sections.some((s) => s.id === section)),
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
function flattenGroups(
  groups: Record<string, FormValues["groups"][string]>,
  sourceDocument: string,
  sourceDate: string,
): FieldEntry[] {
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

export interface BsaResult {
  /** Every field known about the case so far, plus this assessment's own
   * entries — carried forward for document 05+. */
  caseFields: FieldEntry[];
  /** Gate names this submission satisfies. Populated with "fba.approved"
   * only when `analysis.conclusion` (04.9, "Hard clinical gate. Approval
   * here sets fba.approved" per the registry) was actually completed —
   * never inferred any other way. */
  approvedGates: ReadonlySet<string>;
}

export interface BsaFormProps {
  /** Everything known about the case up to this point. */
  priorFields: FieldEntry[];
  /** The pathway resolved at triage (document 02) — "no_rp" or "interim"
   * only; "comprehensive" cannot occur yet, since it requires
   * fba.approved, which this document is the first place to set. */
  pathway: Pathway;
  /** Called once submission succeeds. This assessment never decides a
   * strategy — it records the practitioner's own interpretation. */
  onSubmitted: (result: BsaResult) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

export function BsaForm({ priorFields, pathway, onSubmitted, now = () => new Date() }: BsaFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = useMemo(
    () => requiredFieldIds(BSA_VISIBILITY_RULES, values.scalar, BSA_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const bsaId = "bsa-draft"; // one draft per session in this standalone build

  // Standalone (MD-005/MD-006), same as documents 01-03: cross-document
  // prefill is locked off, so quoted fields fall back to "Not yet
  // available" until Stage 11 turns connected mode on.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: priorFields };
    const targetDocument = toTargetDocument(BSA_DOCUMENT_ID, bsaId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.standalone, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [priorFields]);

  // See CONTRADICTIONS.md #6: under a no_rp pathway this always returns
  // the fba.approved violation, even though this document is the one
  // place that gate is earned — surfaced as guidance text (standalone
  // never blocks), not suppressed.
  const gateViolations: GateViolation[] = useMemo(() => {
    const targetDocument = toTargetDocument(BSA_DOCUMENT_ID, bsaId);
    return checkAuthoringGates(
      { documentId: BSA_DOCUMENT_ID, pathway, approvedGates: new Set(), targetDocument },
      CAPABILITIES.standalone,
    );
  }, [pathway]);

  function handleDownloadBlank() {
    renderBlankDocxBlob(BSA_DOCUMENT, BSA_DOCUMENT_ID, BSA_FIELDS, FRACTA_FLOW_BRAND).then((blob) =>
      download(blob, "fracta-flow-bsa-fba-blank.docx"),
    );
  }

  function handleDownloadCompleted() {
    renderCompletedDocxBlob(
      BSA_DOCUMENT,
      BSA_DOCUMENT_ID,
      BSA_FIELDS,
      FRACTA_FLOW_BRAND,
      flattenValuesForExport(values),
    ).then((blob) => download(blob, "fracta-flow-bsa-fba-completed.docx"));
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
      sourceDocument: bsaId,
      sourceDate: timestamp,
    }));
    const groupEntries = flattenGroups(values.groups, bsaId, timestamp);
    const caseFields = [...priorFields, ...scalarEntries, ...groupEntries];

    const conclusion = values.scalar["analysis.conclusion"];
    const approvedGates = new Set<string>(
      conclusion !== undefined && conclusion !== null && conclusion !== "" ? ["fba.approved"] : [],
    );

    setSubmitted(true);
    onSubmitted({ caseFields, approvedGates });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Combined BSA/FBA submitted</h1>
        <p>
          The assessment findings recorded above are Frame's, entered here for review — this
          document does not conduct its own behaviour assessment. The conclusion and sign-off
          are the practitioner's own interpretation, entered by hand, not inferred or scored
          automatically.
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

      {gateViolations.length > 0 && (
        <div className="no-print" style={{ border: "1px solid #886600", background: "#fff8e1", padding: "0.75rem", marginBottom: "1rem" }}>
          {gateViolations.map((v) => (
            <p key={v.gate} style={{ margin: "0.25rem 0" }}>
              {v.message}
            </p>
          ))}
        </div>
      )}

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={BSA_DOCUMENT}
        fields={BSA_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={BSA_VISIBILITY_RULES}
        alwaysRequiredFieldIds={BSA_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
        quotedFields={BSA_QUOTED_FIELDS}
        quotedValues={quotedValues}
      />

      <ProfessionalToolDisclaimer />

      <button type="submit" className="primary no-print">
        Submit BSA/FBA
      </button>
    </form>
  );
}

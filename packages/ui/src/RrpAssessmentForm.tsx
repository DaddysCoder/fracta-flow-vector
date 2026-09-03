import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import type { FieldEntry } from "@pbs/core";
import { useMemo, useState } from "react";
import { canUseFeature } from "./commercial/entitlements.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { ExportControls } from "./commercial/ExportControls.js";
import { CardSectionsForm, flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { PrintLetterhead } from "./print/PrintLetterhead.js";
import { ProfessionalToolDisclaimer } from "./ProfessionalToolDisclaimer.js";
import { RRP_ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS, RRP_ASSESSMENT_DOCUMENT_ID, RRP_ASSESSMENT_VISIBILITY_RULES } from "./rrpAssessment.js";
import { requiredFieldIds } from "./visibility.js";

const maybeDoc = registry.documents[RRP_ASSESSMENT_DOCUMENT_ID];
if (!maybeDoc) throw new Error(`registry is missing document "${RRP_ASSESSMENT_DOCUMENT_ID}"`);
const RRP_ASSESSMENT_DOCUMENT: DocumentDef = maybeDoc;

const RRP_ASSESSMENT_FIELDS = registry.fields.filter((f) =>
  RRP_ASSESSMENT_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface RrpAssessmentResult {
  caseFields: FieldEntry[];
}

export interface RrpAssessmentFormProps {
  priorFields?: FieldEntry[];
  onSubmitted?: (result: RrpAssessmentResult) => void;
  now?: () => Date;
}

/**
 * RRP Assessment (document 10) — required before an Interim BSP for any
 * participant flagged with a possible or confirmed restrictive practice.
 * Single scrolling page of card sections (never a wizard), matching the
 * prototype's `isRrpAssessment` view: a practice-type chip select, then
 * one card per selected practice type.
 */
export function RrpAssessmentForm({ priorFields = [], onSubmitted, now = () => new Date() }: RrpAssessmentFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const { entitlements, requestUpgrade, logoUrl } = useVectorCommercial();
  const canUse = canUseFeature(entitlements, "rrp_assessment");

  const required = useMemo(
    () => requiredFieldIds(RRP_ASSESSMENT_VISIBILITY_RULES, values.scalar, RRP_ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const documentId = "rrp-assessment-draft";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = [...required].filter((id) => {
      const v = values.scalar[id];
      return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
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
      sourceDocument: documentId,
      sourceDate: timestamp,
    }));
    const caseFields = [...priorFields, ...scalarEntries];

    setSubmitted(true);
    onSubmitted?.({ caseFields });
  }

  if (!canUse) {
    return (
      <div className="card">
        <p className="wizard-eyebrow" style={{ marginBottom: "10px" }}>
          RRP ASSESSMENT · VECTOR
        </p>
        <h1 style={{ margin: "0 0 0.5rem" }}>RRP Assessment requires Vector Paid</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
          Upgrade to unlock the RRP Assessment. Content stays on your device and is never sent to
          WHATBIT servers.
        </p>
        <button type="button" className="primary" onClick={() => requestUpgrade("rrp_assessment")}>
          Upgrade to unlock
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div role="status">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">RRP ASSESSMENT · PAID</span>
        </div>
        <h1>RRP Assessment complete</h1>
        <p>
          Your assessment remains in this browser session only. Use export or print if you want a
          copy outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="print-report">
      <PrintLetterhead docTitle="RRP Assessment" logoUrl={logoUrl} />
      <div className="no-print">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">RRP ASSESSMENT · PAID</span>
        </div>
        <h1 style={{ margin: "0 0 0.375rem" }}>RRP Assessment</h1>
        <p style={{ margin: "0 0 1.5rem", maxWidth: "640px", color: "var(--muted)" }}>
          Required before an Interim BSP for any participant flagged with a possible or confirmed
          restrictive practice. Fact-gathering is kept separate from the reduction plan.
        </p>
      </div>

      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(RRP_ASSESSMENT_DOCUMENT, RRP_ASSESSMENT_DOCUMENT_ID, RRP_ASSESSMENT_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            RRP_ASSESSMENT_DOCUMENT,
            RRP_ASSESSMENT_DOCUMENT_ID,
            RRP_ASSESSMENT_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-rrp-assessment-blank.docx"
        completedFilename="vector-rrp-assessment-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <CardSectionsForm
        document={RRP_ASSESSMENT_DOCUMENT}
        fields={RRP_ASSESSMENT_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={RRP_ASSESSMENT_VISIBILITY_RULES}
        alwaysRequiredFieldIds={RRP_ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
      />

      <ProfessionalToolDisclaimer />

      <button type="submit" className="primary no-print" style={{ marginTop: "0.5rem" }}>
        Complete assessment
      </button>
    </form>
  );
}

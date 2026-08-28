import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import type { FieldEntry } from "@pbs/core";
import { useMemo, useState } from "react";
import { canUseFeature } from "./commercial/entitlements.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { ExportControls } from "./commercial/ExportControls.js";
import { CardSectionsForm, flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { PROGRESS_REPORT_ALWAYS_REQUIRED_FIELD_IDS, PROGRESS_REPORT_DOCUMENT_ID, PROGRESS_REPORT_VISIBILITY_RULES } from "./progressReport.js";
import { requiredFieldIds } from "./visibility.js";

const maybeDoc = registry.documents[PROGRESS_REPORT_DOCUMENT_ID];
if (!maybeDoc) throw new Error(`registry is missing document "${PROGRESS_REPORT_DOCUMENT_ID}"`);
const PROGRESS_REPORT_DOCUMENT: DocumentDef = maybeDoc;

const PROGRESS_REPORT_FIELDS = registry.fields.filter((f) =>
  PROGRESS_REPORT_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface ProgressReportResult {
  caseFields: FieldEntry[];
}

export interface ProgressReportFormProps {
  priorFields?: FieldEntry[];
  onSubmitted?: (result: ProgressReportResult) => void;
  now?: () => Date;
}

/**
 * Progress Report (document 12) — shares its first 5 sections verbatim
 * with Support Letter (same registry section ids, see PLAN_new_documents.md),
 * then Progress since last report / Strategies trialled / Goal progress /
 * Summary and sign-off. Single scrolling page of card sections, matching
 * the prototype's `isProgressReport` view.
 */
export function ProgressReportForm({ priorFields = [], onSubmitted, now = () => new Date() }: ProgressReportFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canUse = canUseFeature(entitlements, "progress_report");

  const required = useMemo(
    () => requiredFieldIds(PROGRESS_REPORT_VISIBILITY_RULES, values.scalar, PROGRESS_REPORT_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const documentId = "progress-report-draft";

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
          PROGRESS REPORT · VECTOR
        </p>
        <h1 style={{ margin: "0 0 0.5rem" }}>Progress Report requires Vector Paid</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
          Upgrade to unlock the Progress Report. Content stays on your device and is never sent to
          WHATBIT servers.
        </p>
        <button type="button" className="primary" onClick={() => requestUpgrade("progress_report")}>
          Upgrade to unlock
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div role="status">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">PROGRESS REPORT · PAID</span>
        </div>
        <h1>Progress report complete</h1>
        <p>
          Your report remains in this browser session only. Use export or print if you want a copy
          outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="wizard-eyebrow-row">
        <span className="wizard-eyebrow">PROGRESS REPORT · PAID</span>
      </div>
      <h1 style={{ margin: "0 0 0.375rem" }}>Progress Report</h1>
      <p style={{ margin: "0 0 1.5rem", maxWidth: "640px", color: "var(--muted)" }}>
        Summarises plan progress for an NDIS plan review.
      </p>

      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(PROGRESS_REPORT_DOCUMENT, PROGRESS_REPORT_DOCUMENT_ID, PROGRESS_REPORT_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            PROGRESS_REPORT_DOCUMENT,
            PROGRESS_REPORT_DOCUMENT_ID,
            PROGRESS_REPORT_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-progress-report-blank.docx"
        completedFilename="vector-progress-report-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <CardSectionsForm
        document={PROGRESS_REPORT_DOCUMENT}
        fields={PROGRESS_REPORT_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={PROGRESS_REPORT_VISIBILITY_RULES}
        alwaysRequiredFieldIds={PROGRESS_REPORT_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
      />

      <button type="submit" className="primary no-print" style={{ marginTop: "0.5rem" }}>
        Complete progress report
      </button>
    </form>
  );
}

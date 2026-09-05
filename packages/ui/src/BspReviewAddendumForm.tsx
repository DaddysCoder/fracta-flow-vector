import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import type { FieldEntry } from "@pbs/core";
import { useMemo, useState } from "react";
import { canUseFeature } from "./commercial/entitlements.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { ExportControls } from "./commercial/ExportControls.js";
import {
  BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS,
  BSP_REVIEW_ADDENDUM_DOCUMENT_ID,
  BSP_REVIEW_ADDENDUM_VISIBILITY_RULES,
} from "./bspReviewAddendum.js";
import { CardSectionsForm, flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { PrintLetterhead } from "./print/PrintLetterhead.js";
import { ProfessionalToolDisclaimer } from "./ProfessionalToolDisclaimer.js";
import { requiredFieldIds } from "./visibility.js";

const maybeDoc = registry.documents[BSP_REVIEW_ADDENDUM_DOCUMENT_ID];
if (!maybeDoc) throw new Error(`registry is missing document "${BSP_REVIEW_ADDENDUM_DOCUMENT_ID}"`);
const BSP_REVIEW_ADDENDUM_DOCUMENT: DocumentDef = maybeDoc;

const BSP_REVIEW_ADDENDUM_FIELDS = registry.fields.filter((f) =>
  BSP_REVIEW_ADDENDUM_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface BspReviewAddendumResult {
  caseFields: FieldEntry[];
}

export interface BspReviewAddendumFormProps {
  priorFields?: FieldEntry[];
  onSubmitted?: (result: BspReviewAddendumResult) => void;
  now?: () => Date;
}

/**
 * BSP Review / Change Addendum (document 13) — records a scheduled or
 * triggered review of an existing behaviour support plan: implementation
 * findings, participant/support-network feedback, strategy changes, and
 * practitioner sign-off. Amends an existing plan; does not replace
 * documents 07-09. Single scrolling page of card sections, same shape as
 * `RrpAssessmentForm`.
 */
export function BspReviewAddendumForm({ priorFields = [], onSubmitted, now = () => new Date() }: BspReviewAddendumFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const { entitlements, requestUpgrade, logoUrl } = useVectorCommercial();
  const canUse = canUseFeature(entitlements, "bsp_review_addendum");

  const required = useMemo(
    () =>
      requiredFieldIds(BSP_REVIEW_ADDENDUM_VISIBILITY_RULES, values.scalar, BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const documentId = "bsp-review-addendum-draft";

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
          BSP REVIEW / CHANGE ADDENDUM · VECTOR
        </p>
        <h1 style={{ margin: "0 0 0.5rem" }}>BSP Review / Change Addendum requires Vector Paid</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
          Upgrade to unlock the review addendum. Content stays on your device and is never sent to
          WHATBIT servers.
        </p>
        <button type="button" className="primary" onClick={() => requestUpgrade("bsp_review_addendum")}>
          Upgrade to unlock
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div role="status">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">BSP REVIEW / CHANGE ADDENDUM · PAID</span>
        </div>
        <h1>Review addendum complete</h1>
        <p>
          This addendum amends the plan named above — it does not replace it. Your review remains
          in this browser session only. Use export or print if you want a copy outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="print-report">
      <PrintLetterhead docTitle="BSP Review / Change Addendum" logoUrl={logoUrl} />
      <div className="no-print">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">BSP REVIEW / CHANGE ADDENDUM · PAID</span>
        </div>
        <h1 style={{ margin: "0 0 0.375rem" }}>BSP Review / Change Addendum</h1>
        <p style={{ margin: "0 0 1.5rem", maxWidth: "640px", color: "var(--muted)" }}>
          Records a scheduled or triggered review of an existing plan — implementation findings,
          feedback, strategy changes and sign-off. Amends the plan named below; does not replace it.
        </p>
      </div>

      <ExportControls
        renderBlank={(brand) =>
          renderBlankDocxBlob(BSP_REVIEW_ADDENDUM_DOCUMENT, BSP_REVIEW_ADDENDUM_DOCUMENT_ID, BSP_REVIEW_ADDENDUM_FIELDS, brand)
        }
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            BSP_REVIEW_ADDENDUM_DOCUMENT,
            BSP_REVIEW_ADDENDUM_DOCUMENT_ID,
            BSP_REVIEW_ADDENDUM_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-bsp-review-addendum-blank.docx"
        completedFilename="vector-bsp-review-addendum-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <CardSectionsForm
        document={BSP_REVIEW_ADDENDUM_DOCUMENT}
        fields={BSP_REVIEW_ADDENDUM_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={BSP_REVIEW_ADDENDUM_VISIBILITY_RULES}
        alwaysRequiredFieldIds={BSP_REVIEW_ADDENDUM_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
      />

      <ProfessionalToolDisclaimer />

      <button type="submit" className="primary no-print" style={{ marginTop: "0.5rem" }}>
        Complete review
      </button>
    </form>
  );
}

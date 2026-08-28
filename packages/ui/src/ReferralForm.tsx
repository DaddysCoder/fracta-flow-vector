import { createTriageTask, type FieldEntry, type TriageTask } from "@pbs/core";
import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { ExportControls } from "./commercial/ExportControls.js";
import { flattenValuesForExport, FormRenderer, type FormValues } from "./FormRenderer.js";
import {
  REFERRAL_ALWAYS_REQUIRED_FIELD_IDS,
  REFERRAL_DOCUMENT_ID,
  REFERRAL_VISIBILITY_RULES,
} from "./referral.js";
import { requiredFieldIds } from "./visibility.js";

const maybeReferralDocument = registry.documents[REFERRAL_DOCUMENT_ID];
if (!maybeReferralDocument) throw new Error(`registry is missing document "${REFERRAL_DOCUMENT_ID}"`);
const REFERRAL_DOCUMENT: DocumentDef = maybeReferralDocument;

const REFERRAL_FIELDS = registry.fields.filter((f) =>
  REFERRAL_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface ReferralFormProps {
  /** Called once submission succeeds — this is the ONLY thing submission
   * does. It never decides acceptance or a clinical pathway. */
  onSubmitted: (task: TriageTask) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

export function ReferralForm({ onSubmitted, now = () => new Date() }: ReferralFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = useMemo(
    () => requiredFieldIds(REFERRAL_VISIBILITY_RULES, values.scalar, REFERRAL_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const referralId = "referral-draft"; // one draft per session in this standalone build

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
    const fields: FieldEntry[] = Object.entries(values.scalar).map(([fieldId, value]) => ({
      fieldId,
      value,
      sourceDocument: referralId,
      sourceDate: timestamp,
    }));

    const task = createTriageTask({
      id: `triage-${referralId}`,
      referralDocumentId: referralId,
      createdAt: timestamp,
      urgent: values.scalar["referral.urgent"] === "yes",
      fields,
    });

    setSubmitted(true);
    onSubmitted(task);
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Referral submitted</h1>
        <p>
          A triage task has been created for a practitioner to review. No acceptance or clinical
          pathway decision has been made — that happens during triage.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(REFERRAL_DOCUMENT, REFERRAL_DOCUMENT_ID, REFERRAL_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            REFERRAL_DOCUMENT,
            REFERRAL_DOCUMENT_ID,
            REFERRAL_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-referral-blank.docx"
        completedFilename="vector-referral-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={REFERRAL_DOCUMENT}
        fields={REFERRAL_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={REFERRAL_VISIBILITY_RULES}
        alwaysRequiredFieldIds={REFERRAL_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
      />

      <button type="submit" className="primary no-print">
        Submit referral
      </button>
    </form>
  );
}

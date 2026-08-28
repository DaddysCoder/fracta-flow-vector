import { createTriageTask, type FieldEntry, type TriageTask } from "@pbs/core";
import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef, type FieldDef } from "@pbs/registry";
import { useState } from "react";
import { ExportControls } from "./commercial/ExportControls.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { FormWizard } from "./FormWizard.js";
import { saveReferralHandoff } from "./localReferralHandoff.js";
import {
  REFERRAL_ALWAYS_REQUIRED_FIELD_IDS,
  REFERRAL_DOCUMENT_ID,
  REFERRAL_VISIBILITY_RULES,
} from "./referral.js";

const maybeReferralDocument = registry.documents[REFERRAL_DOCUMENT_ID];
if (!maybeReferralDocument) throw new Error(`registry is missing document "${REFERRAL_DOCUMENT_ID}"`);
const REFERRAL_DOCUMENT: DocumentDef = maybeReferralDocument;

const REFERRAL_SECTION_IDS = new Set(REFERRAL_DOCUMENT.sections.map((section) => section.id));

/**
 * Public Referral is independently completable. Include fields rendered into
 * this document even when the connected workflow normally supplies them from
 * system/context, so standalone Vector never depends on hidden prior data.
 */
const REFERRAL_STANDALONE_FIELDS: FieldDef[] = registry.fields.flatMap((field) => {
  if (REFERRAL_SECTION_IDS.has(field.askedIn)) return [field];
  const standaloneSection = field.rendersIn.find((sectionId) => REFERRAL_SECTION_IDS.has(sectionId));
  return standaloneSection ? [{ ...field, askedIn: standaloneSection } as FieldDef] : [];
});

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface ReferralFormProps {
  onSubmitted: (task: TriageTask) => void;
  now?: () => Date;
}

export function ReferralForm({ onSubmitted, now = () => new Date() }: ReferralFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const { entitlements } = useVectorCommercial();

  const referralId = "referral-draft";

  function handleSubmit() {
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
    saveReferralHandoff(values.scalar);
    onSubmitted(task);
  }

  function reset() {
    setValues(EMPTY_VALUES);
    setSubmitted(false);
  }

  const exportControls = (
    <ExportControls
      renderBlank={(brand) => renderBlankDocxBlob(REFERRAL_DOCUMENT, REFERRAL_DOCUMENT_ID, REFERRAL_STANDALONE_FIELDS, brand)}
      renderCompleted={(brand) =>
        renderCompletedDocxBlob(
          REFERRAL_DOCUMENT,
          REFERRAL_DOCUMENT_ID,
          REFERRAL_STANDALONE_FIELDS,
          brand,
          flattenValuesForExport(values),
        )
      }
      blankFilename="vector-referral-blank.docx"
      completedFilename="vector-referral-completed.docx"
      showBlank={false}
    />
  );

  if (submitted) {
    return (
      <div role="status" className="vector-complete-state">
        <div className="vector-complete-mark" aria-hidden="true">✓</div>
        <h1>Referral complete</h1>
        <p>
          Your referral remains in this browser session only. Use export or print if you want a copy outside this device.
        </p>
        {exportControls}
        <button type="button" onClick={reset}>
          Start another referral
        </button>
      </div>
    );
  }

  return (
    <FormWizard
      document={REFERRAL_DOCUMENT}
      fields={REFERRAL_STANDALONE_FIELDS}
      values={values}
      onChange={setValues}
      visibilityRules={REFERRAL_VISIBILITY_RULES}
      alwaysRequiredFieldIds={REFERRAL_ALWAYS_REQUIRED_FIELD_IDS}
      newRowId={newRowId}
      documentEyebrow={`Document ${REFERRAL_DOCUMENT_ID} · ${entitlements.plan === "paid" ? "Paid" : "Free"}`}
      onComplete={handleSubmit}
      completeLabel="Send referral"
    />
  );
}

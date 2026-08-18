import type { FieldEntry } from "@pbs/core";
import { useMemo, useState } from "react";
import {
  CAPTURE_ALWAYS_REQUIRED_FIELD_IDS,
  CAPTURE_DOCUMENT_ID,
  CAPTURE_INSTANCE_ID,
  CAPTURE_VISIBILITY_RULES,
} from "./capture.js";
import { DocumentShell, SavedNotice } from "./DocumentShell.js";
import { entriesFrom, quotedValuesFor } from "./documentForm.js";
import type { FormValues } from "./FormRenderer.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

export interface CaptureResult {
  /** Rows recorded here, and nowhere else. Never merged into the case
   * record documents 04-09 read from. */
  captureFields: FieldEntry[];
}

export interface CaptureFormProps {
  onSubmitted: (result: CaptureResult) => void;
  now?: () => Date;
}

/**
 * Document 05 — Behaviour Data Capture. A standalone fallback log, not
 * an assessment. See `capture.ts` for why its rows never reach the
 * Document 04 FBA record.
 */
export function CaptureForm({ onSubmitted, now = () => new Date() }: CaptureFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);

  // No prior fields are passed in at all: this document quotes nothing
  // from the case, by design. Resolving against an empty record keeps the
  // shell's contract uniform without opening a channel from 04.
  const quotedValues = useMemo(
    () =>
      quotedValuesFor({
        documentId: CAPTURE_DOCUMENT_ID,
        instanceId: CAPTURE_INSTANCE_ID,
        priorFields: [],
        now: now(),
      }),
    [],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const captureFields = entriesFrom(values, CAPTURE_INSTANCE_ID, now().toISOString());
    setSubmitted(true);
    onSubmitted({ captureFields });
  }

  if (submitted) {
    return (
      <SavedNotice title="Behaviour data capture saved" onResume={() => setSubmitted(false)}>
        <p>
          These rows stay in this log. They do not change the Assessment / FBA Record, and no
          assessment conclusion has been altered by recording them.
        </p>
      </SavedNotice>
    );
  }

  return (
    <DocumentShell
      documentId={CAPTURE_DOCUMENT_ID}
      slug="behaviour-data-capture"
      values={values}
      onChange={setValues}
      visibilityRules={CAPTURE_VISIBILITY_RULES}
      alwaysRequiredFieldIds={CAPTURE_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save capture log"
      beforeForm={
        <p className="field-note">
          A lightweight fallback log for observed incidents. It is not an assessment and does not
          feed the Assessment / FBA Record (document 04) — rows recorded here stay here.
        </p>
      }
    />
  );
}

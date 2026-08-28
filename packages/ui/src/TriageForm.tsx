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
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { FormWizard } from "./FormWizard.js";
import { toPathwayPermissions, toTargetDocument } from "./registryAdapter.js";
import { TRIAGE_ALWAYS_REQUIRED_FIELD_IDS, TRIAGE_DOCUMENT_ID, TRIAGE_VISIBILITY_RULES } from "./triage.js";

const maybeTriageDocument = registry.documents[TRIAGE_DOCUMENT_ID];
if (!maybeTriageDocument) throw new Error(`registry is missing document "${TRIAGE_DOCUMENT_ID}"`);
const TRIAGE_DOCUMENT: DocumentDef = maybeTriageDocument;

const TRIAGE_FIELDS = registry.fields.filter((f) =>
  TRIAGE_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

const TRIAGE_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !TRIAGE_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => TRIAGE_DOCUMENT.sections.some((s) => s.id === section)),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

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
  caseFields: FieldEntry[];
  resolvedPathway: ResolvedPathway;
}

const EMPTY_TRIAGE_TASK: TriageTask = {
  id: "vector-standalone-triage",
  referralDocumentId: "vector-standalone-referral",
  createdAt: "1970-01-01T00:00:00.000Z",
  priority: "standard",
  fields: [],
};

export interface TriageFormProps {
  task?: TriageTask;
  onSubmitted: (result: TriageResult) => void;
  now?: () => Date;
}

export function TriageForm({ task = EMPTY_TRIAGE_TASK, onSubmitted, now = () => new Date() }: TriageFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const { entitlements } = useVectorCommercial();

  const triageId = "triage-draft";

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

  function handleSubmit() {
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
      new Set(),
    );

    setSubmitted(true);
    onSubmitted({ caseFields, resolvedPathway });
  }

  const exportControls = (
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
      showBlank={false}
    />
  );

  if (submitted) {
    return (
      <div role="status" className="vector-complete-state">
        <div className="vector-complete-mark" aria-hidden="true">✓</div>
        <h1>Practitioner triage complete</h1>
        <p>
          Your triage record remains in this browser session only. The classification and outcome remain your practitioner judgement; Vector does not infer or score them automatically.
        </p>
        {exportControls}
      </div>
    );
  }

  return (
    <FormWizard
      document={TRIAGE_DOCUMENT}
      fields={TRIAGE_FIELDS}
      values={values}
      onChange={setValues}
      visibilityRules={TRIAGE_VISIBILITY_RULES}
      alwaysRequiredFieldIds={TRIAGE_ALWAYS_REQUIRED_FIELD_IDS}
      newRowId={newRowId}
      quotedFields={TRIAGE_QUOTED_FIELDS}
      quotedValues={quotedValues}
      documentEyebrow={`Document ${TRIAGE_DOCUMENT_ID} · ${entitlements.plan === "paid" ? "Paid" : "Free"}`}
      onComplete={handleSubmit}
      completeLabel="Complete triage"
    />
  );
}

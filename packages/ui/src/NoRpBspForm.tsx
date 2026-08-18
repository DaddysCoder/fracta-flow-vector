import {
  createDraftVersion,
  hashValue,
  type DocumentVersion,
  type FieldEntry,
  type Pathway,
} from "@pbs/core";
import { useMemo, useState } from "react";
import { DocumentShell, GateBanner, SavedNotice, newRowId } from "./DocumentShell.js";
import {
  authoringGates,
  dedupeViolations,
  documentDef,
  entriesFrom,
  quotedValuesFor,
  releaseGates,
} from "./documentForm.js";
import type { FormValues } from "./FormRenderer.js";
import {
  NO_RP_BSP_DOCUMENT_ID,
  noRpBspRenderedFields,
  isRrpField,
  PLAN_ALWAYS_REQUIRED_FIELD_IDS,
  PLAN_VISIBILITY_RULES,
} from "./plan.js";
import { ReleasePanel } from "./ReleasePanel.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

export interface NoRpBspResult {
  caseFields: FieldEntry[];
  version: DocumentVersion;
}

export interface NoRpBspFormProps {
  priorFields: FieldEntry[];
  pathway: Pathway;
  approvedGates: ReadonlySet<string>;
  onSubmitted: (result: NoRpBspResult) => void;
  now?: () => Date;
}

/**
 * Document 07 — No-RP BSP.
 *
 * An assembly document: it asks almost nothing of its own and is built
 * from values quoted out of documents 01-06. MD-012 — it contains no
 * regulated-restrictive-practice content at all, and that is structural
 * rather than a rule this component applies: no `rrp.*`/`interim.*` field
 * lists 07.x in its `rendersIn`, the registry validator's `no-rp-clean`
 * check fails the build if one ever does, and `test/noRpBsp.test.ts`
 * fails loudly from the UI side as well.
 */
export function NoRpBspForm({
  priorFields,
  pathway,
  approvedGates,
  onSubmitted,
  now = () => new Date(),
}: NoRpBspFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const instanceId = "no-rp-bsp-draft";
  const [version, setVersion] = useState<DocumentVersion>(() =>
    createDraftVersion({
      id: instanceId,
      documentType: NO_RP_BSP_DOCUMENT_ID,
      templateHash: hashValue(documentDef(NO_RP_BSP_DOCUMENT_ID)),
    }),
  );

  const quotedValues = useMemo(
    () => quotedValuesFor({ documentId: NO_RP_BSP_DOCUMENT_ID, instanceId, priorFields, now: now() }),
    [priorFields],
  );

  const gateInput = { documentId: NO_RP_BSP_DOCUMENT_ID, instanceId, pathway, approvedGates };
  const authoring = useMemo(() => dedupeViolations(authoringGates(gateInput)), [pathway, approvedGates]);
  const atRelease = useMemo(() => dedupeViolations(releaseGates(gateInput)), [pathway, approvedGates]);

  // Structural assertion, surfaced in the UI rather than only in tests:
  // if RRP content ever reaches this document, say so loudly instead of
  // rendering it.
  const rrpLeak = noRpBspRenderedFields().filter(isRrpField);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const caseFields = [...priorFields, ...entriesFrom(values, instanceId, now().toISOString())];
    setSubmitted(true);
    onSubmitted({ caseFields, version });
  }

  if (submitted) {
    return (
      <SavedNotice title="No-RP behaviour support plan saved" onResume={() => setSubmitted(false)}>
        <p>
          {version.status === "released"
            ? `Released at ${version.releasedAt}. This version is immutable.`
            : "Saved as a draft. It has not been released."}
        </p>
      </SavedNotice>
    );
  }

  return (
    <DocumentShell
      documentId={NO_RP_BSP_DOCUMENT_ID}
      slug="no-rp-bsp"
      values={values}
      onChange={setValues}
      visibilityRules={PLAN_VISIBILITY_RULES}
      alwaysRequiredFieldIds={PLAN_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save plan"
      beforeForm={
        <>
          <GateBanner
            violations={authoring}
            unlockHint="Approve the practitioner conclusion in document 04 (04.9) to unlock this plan."
          />
          {rrpLeak.length > 0 && (
            <div role="alert" style={{ border: "2px solid #8a1f1f", padding: "0.75rem" }}>
              Restrictive-practice content reached the No-RP plan ({rrpLeak.map((f) => f.id).join(", ")}).
              This is a registry error (MD-012) — the plan must not be issued.
            </div>
          )}
          <p className="field-note">
            This plan is assembled from what documents 01-06 already recorded. Nothing here re-asks a
            question that was answered earlier, and no restrictive-practice section exists — not even
            an empty one.
          </p>
        </>
      }
      afterForm={
        <ReleasePanel
          version={version}
          onVersionChange={setVersion}
          violations={atRelease}
          now={now}
          newVersionId={newRowId}
          unlockHint="Approve the FBA conclusion (04.9) before releasing this plan."
        />
      }
    />
  );
}

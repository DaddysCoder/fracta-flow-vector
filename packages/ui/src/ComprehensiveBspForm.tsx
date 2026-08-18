import {
  createDraftVersion,
  hashValue,
  type DocumentVersion,
  type FieldEntry,
  type InterimSafeguard,
  type Pathway,
  type SafeguardDisposition,
} from "@pbs/core";
import { useMemo, useState } from "react";
import { DocumentShell, GateBanner, newRowId } from "./DocumentShell.js";
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
  COMPREHENSIVE_BSP_DOCUMENT_ID,
  PLAN_ALWAYS_REQUIRED_FIELD_IDS,
  PLAN_VISIBILITY_RULES,
  SAFEGUARD_DISPOSITION_LABELS,
  undisposedSafeguards,
} from "./plan.js";
import { ReleasePanel } from "./ReleasePanel.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

export interface ComprehensiveBspResult {
  caseFields: FieldEntry[];
  version: DocumentVersion;
}

export interface ComprehensiveBspFormProps {
  priorFields: FieldEntry[];
  pathway: Pathway;
  approvedGates: ReadonlySet<string>;
  /** Temporary safeguards carried from the Interim plan (document 08).
   * Every one must have a disposition before this plan can release. */
  interimSafeguards: InterimSafeguard[];
  onSubmitted: (result: ComprehensiveBspResult) => void;
  now?: () => Date;
}

/**
 * Document 09 — Comprehensive RRP BSP.
 *
 * Release is gated twice over: on `fba.approved` like the other plans,
 * and on `interim.dispositions_complete` — every temporary safeguard
 * carried from the Interim plan must have been explicitly disposed of
 * (replace | retain_with_new_justification | revise | retire). There is
 * no default disposition; an undecided safeguard blocks release rather
 * than carrying quietly into the comprehensive plan.
 */
export function ComprehensiveBspForm({
  priorFields,
  pathway,
  approvedGates,
  interimSafeguards,
  onSubmitted,
  now = () => new Date(),
}: ComprehensiveBspFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const instanceId = "comprehensive-bsp-draft";
  const [version, setVersion] = useState<DocumentVersion>(() =>
    createDraftVersion({
      id: instanceId,
      documentType: COMPREHENSIVE_BSP_DOCUMENT_ID,
      templateHash: hashValue(documentDef(COMPREHENSIVE_BSP_DOCUMENT_ID)),
    }),
  );

  const quotedValues = useMemo(
    () =>
      quotedValuesFor({
        documentId: COMPREHENSIVE_BSP_DOCUMENT_ID,
        instanceId,
        priorFields,
        now: now(),
      }),
    [priorFields],
  );

  const gateInput = { documentId: COMPREHENSIVE_BSP_DOCUMENT_ID, instanceId, pathway, approvedGates };
  const authoring = useMemo(() => dedupeViolations(authoringGates(gateInput)), [pathway, approvedGates]);
  const atRelease = useMemo(
    () => dedupeViolations(releaseGates(gateInput, interimSafeguards)),
    [pathway, approvedGates, interimSafeguards],
  );

  const undisposed = undisposedSafeguards(interimSafeguards);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const caseFields = [...priorFields, ...entriesFrom(values, instanceId, now().toISOString())];
    setSubmitted(true);
    onSubmitted({ caseFields, version });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Comprehensive behaviour support plan saved</h1>
        <p>
          {version.status === "released"
            ? `Released at ${version.releasedAt}. This version is immutable — a correction creates a successor draft.`
            : "Saved as a draft. It has not been released."}
        </p>
      </div>
    );
  }

  return (
    <DocumentShell
      documentId={COMPREHENSIVE_BSP_DOCUMENT_ID}
      slug="comprehensive-rrp-bsp"
      values={values}
      onChange={setValues}
      visibilityRules={PLAN_VISIBILITY_RULES}
      alwaysRequiredFieldIds={PLAN_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save comprehensive plan"
      beforeForm={
        <>
          <GateBanner
            violations={authoring}
            unlockHint="Approve the practitioner conclusion in document 04 (04.9) to unlock this plan."
          />
          <p className="field-note">
            The full assessment is not repeated here — sections below quote what document 04 already
            concluded rather than re-asking it.
          </p>
        </>
      }
      afterForm={
        <>
          <section className="form-section no-print" aria-labelledby="carried-safeguards">
            <h2 className="section-title" id="carried-safeguards">
              Interim safeguards carried forward
            </h2>
            {interimSafeguards.length === 0 ? (
              <p className="field-note">
                No interim safeguards were carried into this plan.
              </p>
            ) : (
              <ul>
                {interimSafeguards.map((safeguard) => (
                  <li key={safeguard.id}>
                    {safeguard.id.slice(0, 8)} — {safeguard.unassessed ? "unassessed · " : ""}
                    {safeguard.disposition
                      ? SAFEGUARD_DISPOSITION_LABELS[safeguard.disposition as SafeguardDisposition]
                      : "no disposition decided — blocks release"}
                  </li>
                ))}
              </ul>
            )}
            {undisposed.length > 0 && (
              <p role="alert" className="field-note">
                {undisposed.length} safeguard(s) still undisposed. Decide each one on the Interim plan
                (document 08) before releasing.
              </p>
            )}
          </section>

          <ReleasePanel
            version={version}
            onVersionChange={setVersion}
            violations={atRelease}
            now={now}
            newVersionId={newRowId}
            unlockHint="Every interim safeguard needs a disposition, and the FBA conclusion must be approved."
          />
        </>
      }
    />
  );
}

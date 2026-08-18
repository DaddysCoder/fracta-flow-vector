import {
  approve,
  createDraftVersion,
  hashValue,
  type DocumentVersion,
  type FieldEntry,
  type Pathway,
} from "@pbs/core";
import { useMemo, useState } from "react";
import {
  ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS,
  ASSESSMENT_DOCUMENT_ID,
  ASSESSMENT_VISIBILITY_RULES,
  FBA_GATE,
  fbaApprovalBlockers,
  fbaGateUnlocks,
} from "./assessment.js";
import { DocumentShell, GateBanner, SavedNotice } from "./DocumentShell.js";
import {
  authoringGates,
  dedupeViolations,
  documentDef,
  entriesFrom,
  quotedValuesFor,
} from "./documentForm.js";
import type { FormValues } from "./FormRenderer.js";
import {
  acceptFinding,
  buildParticipantContext,
  reconcileBundle,
  type FbaOutcomeBundle,
  type ReconciliationItem,
} from "./frameContractStub.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

const STATUS_LABEL: Record<ReconciliationItem["status"], string> = {
  offered: "Offered — not in the record yet",
  accepted_unchanged: "In the record, unchanged",
  differs: "In the record, differs from the assessment output",
  out_of_scope: "Rejected — outside this document's scope",
};

export interface AssessmentResult {
  caseFields: FieldEntry[];
  /** The draft (or approved) version of this Assessment/FBA Record. */
  version: DocumentVersion;
  /** Gate names this document has set, e.g. {"fba.approved"}. */
  approvedGates: ReadonlySet<string>;
}

export interface AssessmentFormProps {
  /** Everything known about the case so far (documents 01-03). */
  priorFields: FieldEntry[];
  pathway: Pathway;
  /** Gates already approved for this case when the document opens. */
  approvedGates: ReadonlySet<string>;
  onSubmitted: (result: AssessmentResult) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

/**
 * Document 04 — the Assessment / FBA Record.
 *
 * Vector does not run a functional behaviour assessment. Frame does.
 * This document receives Frame's `FbaOutcomeBundle`, shows what it
 * contains beside what Vector currently holds, and lets the practitioner
 * reconcile the two — one explicit click per finding, nothing copied in
 * automatically. The practitioner's own conclusion at 04.9 is what
 * approval attaches to, and approval is what sets the `fba.approved`
 * gate that unlocks documents 06/07/09.
 *
 * Standalone first (MD-005/MD-006): with no bundle and no other tool
 * present, this document still opens and completes as a manual form.
 * See CONTRADICTIONS.md #6 for the boundary decision this implements.
 */
export function AssessmentForm({
  priorFields,
  pathway,
  approvedGates,
  onSubmitted,
  now = () => new Date(),
}: AssessmentFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [bundle, setBundle] = useState<FbaOutcomeBundle | null>(null);
  const [bundleText, setBundleText] = useState("");
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [gates, setGates] = useState<ReadonlySet<string>>(approvedGates);
  const [version, setVersion] = useState<DocumentVersion>(() =>
    createDraftVersion({
      id: "assessment-draft",
      documentType: ASSESSMENT_DOCUMENT_ID,
      templateHash: hashValue(documentDef(ASSESSMENT_DOCUMENT_ID)),
    }),
  );

  const assessmentId = "assessment-draft"; // one draft per session in this standalone build

  const quotedValues = useMemo(
    () =>
      quotedValuesFor({
        documentId: ASSESSMENT_DOCUMENT_ID,
        instanceId: assessmentId,
        priorFields,
        now: now(),
      }),
    [priorFields],
  );

  const violations = useMemo(
    () =>
      dedupeViolations(
        authoringGates({
          documentId: ASSESSMENT_DOCUMENT_ID,
          instanceId: assessmentId,
          pathway,
          approvedGates: gates,
        }),
      ),
    [pathway, gates],
  );

  const items = useMemo(
    () => (bundle ? reconcileBundle(bundle, values) : []),
    [bundle, values],
  );

  const blockers = fbaApprovalBlockers(values.scalar);
  const approved = gates.has(FBA_GATE);

  function handleLoadBundle() {
    try {
      const parsed = JSON.parse(bundleText) as FbaOutcomeBundle;
      if (!parsed || typeof parsed.bundleId !== "string" || !Array.isArray(parsed.findings)) {
        throw new Error("not an FbaOutcomeBundle (needs bundleId and findings[])");
      }
      setBundle(parsed);
      setBundleError(null);
      // Bundle provenance is recorded as ordinary registry values, so it
      // exports and prints like everything else on this document.
      setValues((v) => ({
        ...v,
        scalar: {
          ...v.scalar,
          "fba.bundle_id": parsed.bundleId,
          "fba.bundle_received_at": (parsed.generatedAt ?? "").slice(0, 10),
        },
      }));
    } catch (error) {
      setBundle(null);
      setBundleError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleApprove() {
    if (blockers.length > 0 || approved) return;
    const timestamp = now().toISOString();
    setVersion((v) =>
      approve(v, { by: String(values.scalar["practitioner.identity"] ?? "practitioner"), at: timestamp }),
    );
    setGates(new Set([...gates, FBA_GATE]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const timestamp = now().toISOString();
    const caseFields = [...priorFields, ...entriesFrom(values, assessmentId, timestamp)];
    setSubmitted(true);
    onSubmitted({ caseFields, version, approvedGates: gates });
  }

  if (submitted) {
    return (
      <SavedNotice title="Assessment / FBA record saved" onResume={() => setSubmitted(false)}>
        <p>
          {approved
            ? `The practitioner's conclusion is approved. ${FBA_GATE} is set, which unlocks documents ${fbaGateUnlocks().join(", ")}.`
            : `The conclusion is not approved, so ${FBA_GATE} is not set — documents ${fbaGateUnlocks().join(", ")} stay locked.`}
        </p>
      </SavedNotice>
    );
  }

  const participantContext = buildParticipantContext({
    caseRef: assessmentId,
    pathway,
    preparedAt: now().toISOString(),
    caseFields: priorFields,
  });

  return (
    <DocumentShell
      documentId={ASSESSMENT_DOCUMENT_ID}
      slug="assessment-fba-record"
      values={values}
      onChange={setValues}
      visibilityRules={ASSESSMENT_VISIBILITY_RULES}
      alwaysRequiredFieldIds={ASSESSMENT_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save assessment record"
      beforeForm={
        <>
          <GateBanner violations={violations} />

          <section className="form-section no-print" aria-labelledby="frame-handoff">
            <h2 className="section-title" id="frame-handoff">
              Assessment handoff
            </h2>
            <p className="field-note">
              Behaviour assessment, ABC data, formulation and hypothesis generation are done in the
              assessment tool (Frame), not here. This document receives that outcome bundle, shows what
              it contains, and records what the practitioner decides to accept. Nothing is copied into
              the record without an explicit action below.
            </p>
            <p className="field-note">
              <strong>Integration status:</strong> the shared <code>@fracta/contract</code> package is
              not available yet, so there is no live connection. A bundle can be pasted in below; the
              shape it is read against is a clearly-marked local stub (
              <code>frameContractStub.ts</code>), not the real contract.
            </p>

            <label className="field-label" htmlFor="frame-bundle">
              Paste an FBA outcome bundle (JSON)
            </label>
            <textarea
              id="frame-bundle"
              value={bundleText}
              rows={4}
              onChange={(e) => setBundleText(e.target.value)}
            />
            <button type="button" onClick={handleLoadBundle}>
              Load bundle
            </button>{" "}
            <button type="button" onClick={() => setShowContext((s) => !s)}>
              {showContext ? "Hide" : "Show"} participant context for the assessment tool
            </button>

            {bundleError && (
              <p role="alert" className="field-note">
                Could not read that bundle: {bundleError}
              </p>
            )}

            {showContext && (
              <pre style={{ background: "#f4f4f4", padding: "0.75rem", overflowX: "auto" }}>
                {JSON.stringify(participantContext, null, 2)}
              </pre>
            )}

            {!bundle && (
              <p className="field-note">
                No assessment bundle received. This document still opens and completes as a manual
                form — the sections below are authored by the practitioner in that case.
              </p>
            )}

            {bundle && (
              <div>
                <p className="field-note">
                  Bundle <code>{bundle.bundleId}</code>, generated {bundle.generatedAt} —{" "}
                  {items.length} finding(s).
                </p>
                {items.map((item) => (
                  <div
                    key={item.finding.id}
                    className="field"
                    style={{ borderLeft: "3px solid #ccc", paddingLeft: "0.75rem" }}
                  >
                    <p className="field-label">
                      {item.finding.targetFieldId} — {STATUS_LABEL[item.status]}
                    </p>
                    <p className="field-readonly-value">{item.finding.value}</p>
                    {item.finding.provenance && (
                      <p className="field-note">Source: {item.finding.provenance}</p>
                    )}
                    {item.status === "differs" && (
                      <p className="field-note">
                        Currently recorded here: {String(item.localValue)}
                      </p>
                    )}
                    {item.status !== "out_of_scope" && item.status !== "accepted_unchanged" && (
                      <button
                        type="button"
                        onClick={() => setValues((v) => acceptFinding(v, item.finding))}
                      >
                        {item.status === "differs"
                          ? "Replace the recorded value with this"
                          : "Accept into the record"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      }
      afterForm={
        <section className="form-section no-print" aria-labelledby="fba-approval">
          <h2 className="section-title" id="fba-approval">
            FBA approval
          </h2>
          {approved ? (
            <p role="status">
              Approved at {version.approvals[version.approvals.length - 1]?.at} by{" "}
              {version.approvals[version.approvals.length - 1]?.by}. <strong>{FBA_GATE}</strong> is
              set — documents {fbaGateUnlocks().join(", ")} are unlocked. The approved conclusion
              cannot be edited away silently: correcting it after release creates a successor
              version.
            </p>
          ) : (
            <>
              <p className="field-note">
                Approving the practitioner conclusion (04.9) sets <strong>{FBA_GATE}</strong>, which
                unlocks documents {fbaGateUnlocks().join(", ")}. Until then, Tier-3 and Strategy
                Instance authoring in those documents stays locked. This is a clinical judgement —
                nothing here approves itself.
              </p>
              {blockers.length > 0 && (
                <p role="alert" className="field-note">
                  Cannot approve yet — still empty: {blockers.join(", ")}
                </p>
              )}
              <button type="button" onClick={handleApprove} disabled={blockers.length > 0}>
                Approve FBA conclusion
              </button>
            </>
          )}
        </section>
      }
    />
  );
}

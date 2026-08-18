import type { FieldEntry, Pathway } from "@pbs/core";
import { useMemo, useState } from "react";
import { DocumentShell, GateBanner } from "./DocumentShell.js";
import { authoringGates, dedupeViolations, entriesFrom, quotedValuesFor } from "./documentForm.js";
import type { FormValues } from "./FormRenderer.js";
import {
  PLAN_ALWAYS_REQUIRED_FIELD_IDS,
  PLAN_VISIBILITY_RULES,
  strategyPins,
  STRATEGY_DOCUMENT_ID,
} from "./plan.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

export interface StrategyResult {
  caseFields: FieldEntry[];
}

export interface StrategyFormProps {
  priorFields: FieldEntry[];
  pathway: Pathway;
  approvedGates: ReadonlySet<string>;
  onSubmitted: (result: StrategyResult) => void;
  now?: () => Date;
}

/**
 * Document 06 — Strategy Instance Worksheet.
 *
 * Strategy Instance authoring is gated on `fba.approved` (MD-013): the
 * gate check runs on every render and its result is shown, blocking in
 * connected mode and as guidance in standalone. Each instance pins the
 * Strategy Library entry id and version it was created from — pinned,
 * never live, so a library update cannot change an existing
 * participant's strategy (see `pinStrategy` in `@pbs/core`).
 */
export function StrategyForm({
  priorFields,
  pathway,
  approvedGates,
  onSubmitted,
  now = () => new Date(),
}: StrategyFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const instanceId = "strategy-draft";

  const quotedValues = useMemo(
    () =>
      quotedValuesFor({
        documentId: STRATEGY_DOCUMENT_ID,
        instanceId,
        priorFields,
        now: now(),
      }),
    [priorFields],
  );

  const violations = useMemo(
    () =>
      dedupeViolations(
        authoringGates({
          documentId: STRATEGY_DOCUMENT_ID,
          instanceId,
          pathway,
          approvedGates,
        }),
      ),
    [pathway, approvedGates],
  );

  const blocking = violations.some((v) => v.severity === "blocking");
  const pins = strategyPins(values.groups["strategy_instance"] ?? []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocking) return;
    const caseFields = [...priorFields, ...entriesFrom(values, instanceId, now().toISOString())];
    setSubmitted(true);
    onSubmitted({ caseFields });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Strategy instances saved</h1>
        <p>
          Each instance keeps the Strategy Library version it was pinned to. A later library update
          never changes it — re-pinning is a new instance, authored deliberately.
        </p>
      </div>
    );
  }

  return (
    <DocumentShell
      documentId={STRATEGY_DOCUMENT_ID}
      slug="strategy-instance-worksheet"
      values={values}
      onChange={setValues}
      visibilityRules={PLAN_VISIBILITY_RULES}
      alwaysRequiredFieldIds={PLAN_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save strategy instances"
      submitDisabledReason={
        blocking ? "Locked until the FBA conclusion (04.9) is approved." : undefined
      }
      beforeForm={
        <>
          <GateBanner
            violations={violations}
            unlockHint="Approve the practitioner conclusion in document 04 (04.9) to unlock Strategy Instance authoring."
          />
          <p className="field-note">
            Each Strategy Instance records the Strategy Library entry id and version it was created
            from. That version is pinned at creation: a later library update is never applied to an
            instance that already exists.
          </p>
        </>
      }
      afterForm={
        pins.length > 0 ? (
          <section className="form-section no-print" aria-labelledby="strategy-pins">
            <h2 className="section-title" id="strategy-pins">
              Library pins on this worksheet
            </h2>
            <ul>
              {pins.map((pin) => (
                <li key={pin.rowId}>
                  {pin.libraryId ?? "(no library entry recorded)"} —{" "}
                  {pin.libraryVersion
                    ? `pinned at version ${pin.libraryVersion}`
                    : "no version pinned yet"}
                </li>
              ))}
            </ul>
          </section>
        ) : undefined
      }
    />
  );
}

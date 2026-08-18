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
  INTERIM_BSP_DOCUMENT_ID,
  PLAN_ALWAYS_REQUIRED_FIELD_IDS,
  PLAN_VISIBILITY_RULES,
  SAFEGUARD_DISPOSITIONS,
  SAFEGUARD_DISPOSITION_LABELS,
  SAFEGUARD_GROUP,
  safeguardLabel,
  safeguardsFromRows,
} from "./plan.js";
import { ReleasePanel } from "./ReleasePanel.js";

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

export interface InterimBspResult {
  caseFields: FieldEntry[];
  version: DocumentVersion;
  /** Temporary safeguards recorded here, each flagged `unassessed`, with
   * whatever disposition has been decided so far. Carried to document 09,
   * whose release is blocked while any is undisposed. */
  safeguards: InterimSafeguard[];
}

export interface InterimBspFormProps {
  priorFields: FieldEntry[];
  pathway: Pathway;
  approvedGates: ReadonlySet<string>;
  onSubmitted: (result: InterimBspResult) => void;
  now?: () => Date;
}

/**
 * Document 08 — Interim RRP BSP.
 *
 * The Interim plan permits no Strategy Instances at all: what it records
 * are **temporary safeguards**, always flagged `unassessed` because they
 * are put in place before the assessment concludes. `unassessed` is not a
 * practitioner choice and is therefore not a tick-box — it is a property
 * of every row on this document, shown as such.
 *
 * Each safeguard needs a disposition (replace | retain_with_new_
 * justification | revise | retire) before a Comprehensive plan can
 * release. There is no default: undecided stays undecided and blocks.
 */
export function InterimBspForm({
  priorFields,
  pathway,
  approvedGates,
  onSubmitted,
  now = () => new Date(),
}: InterimBspFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [dispositions, setDispositions] = useState<Record<string, SafeguardDisposition | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const instanceId = "interim-bsp-draft";
  const [version, setVersion] = useState<DocumentVersion>(() =>
    createDraftVersion({
      id: instanceId,
      documentType: INTERIM_BSP_DOCUMENT_ID,
      templateHash: hashValue(documentDef(INTERIM_BSP_DOCUMENT_ID)),
    }),
  );

  const quotedValues = useMemo(
    () => quotedValuesFor({ documentId: INTERIM_BSP_DOCUMENT_ID, instanceId, priorFields, now: now() }),
    [priorFields],
  );

  const gateInput = { documentId: INTERIM_BSP_DOCUMENT_ID, instanceId, pathway, approvedGates };
  const authoring = useMemo(() => dedupeViolations(authoringGates(gateInput)), [pathway, approvedGates]);

  const safeguardRows = values.groups[SAFEGUARD_GROUP] ?? [];
  const safeguards = safeguardsFromRows(safeguardRows, dispositions);
  const atRelease = dedupeViolations(releaseGates(gateInput, safeguards));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const caseFields = [...priorFields, ...entriesFrom(values, instanceId, now().toISOString())];
    setSubmitted(true);
    onSubmitted({ caseFields, version, safeguards });
  }

  if (submitted) {
    const undisposed = safeguards.filter((s) => s.disposition === null).length;
    return (
      <div role="status">
        <h1>Interim behaviour support plan saved</h1>
        <p>
          {safeguards.length} temporary safeguard(s) recorded, all flagged unassessed.{" "}
          {undisposed > 0
            ? `${undisposed} still have no disposition — a Comprehensive plan cannot release until every one is decided.`
            : "Every safeguard has a disposition."}
        </p>
      </div>
    );
  }

  return (
    <DocumentShell
      documentId={INTERIM_BSP_DOCUMENT_ID}
      slug="interim-rrp-bsp"
      values={values}
      onChange={setValues}
      visibilityRules={PLAN_VISIBILITY_RULES}
      alwaysRequiredFieldIds={PLAN_ALWAYS_REQUIRED_FIELD_IDS}
      quotedValues={quotedValues}
      missingFields={[]}
      onSubmit={handleSubmit}
      submitLabel="Save interim plan"
      beforeForm={
        <>
          <GateBanner violations={authoring} />
          <p className="field-note">
            An interim plan holds the situation while the assessment continues. Everything recorded
            under "Temporary safeguards" is <strong>unassessed</strong> by definition — it is not a
            Strategy Instance, and this plan cannot contain one.
          </p>
        </>
      }
      afterForm={
        <section className="form-section no-print" aria-labelledby="safeguard-dispositions">
          <h2 className="section-title" id="safeguard-dispositions">
            Safeguard status and disposition
          </h2>
          {safeguardRows.length === 0 ? (
            <p className="field-note">
              No temporary safeguards recorded yet. Add one under section 08.9 above.
            </p>
          ) : (
            safeguardRows.map((row) => (
              <div className="field" key={row.rowId}>
                <p className="field-label">
                  {safeguardLabel(row)}{" "}
                  <span style={{ color: "#8a1f1f", fontWeight: 700 }}>· unassessed</span>
                </p>
                <label className="field-label" htmlFor={`disposition-${row.rowId}`}>
                  Disposition
                </label>
                <select
                  id={`disposition-${row.rowId}`}
                  value={dispositions[row.rowId] ?? ""}
                  onChange={(e) =>
                    setDispositions((d) => ({
                      ...d,
                      [row.rowId]: (e.target.value || null) as SafeguardDisposition | null,
                    }))
                  }
                >
                  <option value="">Not decided</option>
                  {SAFEGUARD_DISPOSITIONS.map((disposition) => (
                    <option key={disposition} value={disposition}>
                      {SAFEGUARD_DISPOSITION_LABELS[disposition]}
                    </option>
                  ))}
                </select>
                <p className="field-note">
                  No default. Left undecided, this safeguard blocks the release of a Comprehensive
                  plan (document 09).
                </p>
              </div>
            ))
          )}

          <ReleasePanel
            version={version}
            onVersionChange={setVersion}
            violations={atRelease}
            now={now}
            newVersionId={newRowId}
          />
        </section>
      }
    />
  );
}

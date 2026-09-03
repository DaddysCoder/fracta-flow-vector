import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { CAPABILITIES, resolve, type CaseRecord, type FieldEntry } from "@pbs/core";
import { useMemo, useState } from "react";
import { canUseFeature } from "./commercial/entitlements.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { ExportControls } from "./commercial/ExportControls.js";
import { CardSectionsForm, flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { PrintLetterhead } from "./print/PrintLetterhead.js";
import { ProfessionalToolDisclaimer } from "./ProfessionalToolDisclaimer.js";
import { toTargetDocument } from "./registryAdapter.js";
import { SUPPORT_LETTER_ALWAYS_REQUIRED_FIELD_IDS, SUPPORT_LETTER_DOCUMENT_ID, SUPPORT_LETTER_VISIBILITY_RULES } from "./supportLetter.js";
import { computeQuoteTotals, formatAud, SUPPORT_LETTER_LINE_ITEMS } from "./support-letter/quote.js";
import { requiredFieldIds } from "./visibility.js";

const maybeDoc = registry.documents[SUPPORT_LETTER_DOCUMENT_ID];
if (!maybeDoc) throw new Error(`registry is missing document "${SUPPORT_LETTER_DOCUMENT_ID}"`);
const SUPPORT_LETTER_DOCUMENT: DocumentDef = maybeDoc;

const SUPPORT_LETTER_FIELDS = registry.fields.filter((f) =>
  SUPPORT_LETTER_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

/** Restrictive-practices detail quoted from the RRP Assessment (document
 * 10) via `rendersIn` — same cross-document-quoting pattern Triage
 * already uses to quote Referral. Never re-typed here. */
const SUPPORT_LETTER_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !SUPPORT_LETTER_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => SUPPORT_LETTER_DOCUMENT.sections.some((s) => s.id === section)),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

export interface SupportLetterResult {
  caseFields: FieldEntry[];
}

export interface SupportLetterFormProps {
  priorFields?: FieldEntry[];
  onSubmitted?: (result: SupportLetterResult) => void;
  now?: () => Date;
}

function QuoteSummary({ values }: { values: FormValues }) {
  const rate = Number(values.scalar["letter.quote.hourly_rate"] ?? 0);
  const travelHours = Number(values.scalar["letter.quote.travel_hours"] ?? 0);
  const travelParticipants = Number(values.scalar["letter.quote.travel_participants"] ?? 0);
  const includeTravel = travelHours > 0 && travelParticipants > 0;
  const hoursByKey: Record<string, number> = {};
  for (const item of SUPPORT_LETTER_LINE_ITEMS) {
    hoursByKey[item.key] = Number(values.scalar[`letter.quote.hours.${item.key}`] ?? 0);
  }
  const totals = computeQuoteTotals(hoursByKey, rate, travelHours, travelParticipants, includeTravel);

  return (
    <div className="card-recessed" style={{ borderRadius: "10px", padding: "14px", marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
        <span>{totals.totalHours} hours subtotal</span>
        <span className="tabular-nums">{formatAud(totals.subtotal)}</span>
      </div>
      {includeTravel && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
          <span>Apportioned travel ({totals.travelHours} h)</span>
          <span className="tabular-nums">{formatAud(totals.travelAmount)}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--heading-font)",
          fontWeight: 800,
          fontSize: "18px",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "2px solid var(--ink)",
        }}
      >
        <span>Total</span>
        <span className="tabular-nums">{formatAud(totals.grandTotal)}</span>
      </div>
    </div>
  );
}

/**
 * Support Letter (document 11) — single scrolling page of card sections,
 * matching the prototype's `isSupportLetter` view. Restrictive-practices
 * detail is quoted (never re-typed) from RRP Assessment; the funding
 * quote's computed rows/totals live outside FormRenderer's generic field
 * dispatch (see `support-letter/quote.ts`) since they're derived, not
 * authored, values.
 */
export function SupportLetterForm({ priorFields = [], onSubmitted, now = () => new Date() }: SupportLetterFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const { entitlements, requestUpgrade, logoUrl } = useVectorCommercial();
  const canUse = canUseFeature(entitlements, "support_letter");

  const required = useMemo(
    () => requiredFieldIds(SUPPORT_LETTER_VISIBILITY_RULES, values.scalar, SUPPORT_LETTER_ALWAYS_REQUIRED_FIELD_IDS),
    [values],
  );

  const documentId = "support-letter-draft";

  // Standalone (MD-005/MD-006), same convention as every other form: the
  // RRP Assessment quote resolves to "Not yet available" until connected
  // mode exists. See CONTRADICTIONS.md #5.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: priorFields };
    const targetDocument = toTargetDocument(SUPPORT_LETTER_DOCUMENT_ID, documentId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.standalone, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [priorFields]);

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
          SUPPORT LETTER · VECTOR
        </p>
        <h1 style={{ margin: "0 0 0.5rem" }}>Support Letter requires Vector Paid</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
          Upgrade to unlock the Support Letter. Content stays on your device and is never sent to
          WHATBIT servers.
        </p>
        <button type="button" className="primary" onClick={() => requestUpgrade("support_letter")}>
          Upgrade to unlock
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div role="status">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">SUPPORT LETTER · PAID</span>
        </div>
        <h1>Support letter complete</h1>
        <p>
          Your letter remains in this browser session only. Use export or print if you want a copy
          outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="print-report">
      <PrintLetterhead docTitle="Support Letter" logoUrl={logoUrl} />
      <div className="no-print">
        <div className="wizard-eyebrow-row">
          <span className="wizard-eyebrow">SUPPORT LETTER · PAID</span>
        </div>
        <h1 style={{ margin: "0 0 0.375rem" }}>Support Letter</h1>
        <p style={{ margin: "0 0 1.5rem", maxWidth: "680px", color: "var(--muted)" }}>
          A funding recommendation letter for the participant&apos;s NDIS plan — functional impact,
          behaviours of concern, recommended supports and an itemised quote for behaviour support.
        </p>
      </div>

      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(SUPPORT_LETTER_DOCUMENT, SUPPORT_LETTER_DOCUMENT_ID, SUPPORT_LETTER_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            SUPPORT_LETTER_DOCUMENT,
            SUPPORT_LETTER_DOCUMENT_ID,
            SUPPORT_LETTER_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-support-letter-blank.docx"
        completedFilename="vector-support-letter-completed.docx"
      />

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <CardSectionsForm
        document={SUPPORT_LETTER_DOCUMENT}
        fields={SUPPORT_LETTER_FIELDS}
        values={values}
        onChange={setValues}
        visibilityRules={SUPPORT_LETTER_VISIBILITY_RULES}
        alwaysRequiredFieldIds={SUPPORT_LETTER_ALWAYS_REQUIRED_FIELD_IDS}
        newRowId={newRowId}
        quotedFields={SUPPORT_LETTER_QUOTED_FIELDS}
        quotedValues={quotedValues}
      />

      <div className="card" style={{ marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
        <p className="section-title">Quote total</p>
        <p className="field-note" style={{ marginTop: "-0.5rem", marginBottom: "0.75rem" }}>
          Computed from the hours entered in "Quote - behaviour support" above. Travel is
          apportioned — half the return travel time, split across everyone seen that trip — not a
          flat percentage loading.
        </p>
        <QuoteSummary values={values} />
      </div>

      <ProfessionalToolDisclaimer />

      <button type="submit" className="primary no-print" style={{ marginTop: "0.5rem" }}>
        Complete support letter
      </button>
    </form>
  );
}

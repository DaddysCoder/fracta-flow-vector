import type { GateViolation } from "@pbs/core";
import { FRACTA_FLOW_BRAND, renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import type { ReactNode } from "react";
import { documentDef, documentFields, quotedFields } from "./documentForm.js";
import { flattenValuesForExport, FormRenderer, type FormValues } from "./FormRenderer.js";
import type { VisibilityRule } from "./visibility.js";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function newRowId(): string {
  return crypto.randomUUID();
}

export interface GateBannerProps {
  violations: GateViolation[];
  /** What the practitioner can do about it — shown once, under the list. */
  unlockHint?: string;
}

/**
 * Gates always run; only their severity changes with deployment mode
 * (`gates.ts`). A standalone build has no other document to enforce
 * against, so a violation is shown as guidance the practitioner reads —
 * it is never silently dropped, which is why this banner renders in both
 * modes and says which it is.
 */
export function GateBanner({ violations, unlockHint }: GateBannerProps) {
  if (violations.length === 0) return null;
  const blocking = violations.some((v) => v.severity === "blocking");
  return (
    <div
      role={blocking ? "alert" : "status"}
      className="gate-banner"
      style={{
        border: `2px solid ${blocking ? "#8a1f1f" : "#7a5c00"}`,
        background: blocking ? "#fdf1f1" : "#fffaeb",
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
      }}
    >
      <p style={{ fontWeight: 700, margin: "0 0 0.4rem" }}>
        {blocking ? "Locked" : "Guidance — not enforced in standalone mode"}
      </p>
      <ul style={{ margin: "0 0 0.4rem", paddingLeft: "1.2rem" }}>
        {violations.map((v) => (
          <li key={`${v.gate}-${v.message}`}>
            <strong>{v.gate}</strong> — {v.message}
          </li>
        ))}
      </ul>
      {unlockHint && <p className="field-note" style={{ margin: 0 }}>{unlockHint}</p>}
    </div>
  );
}

export interface DocumentShellProps {
  documentId: string;
  /** Filename stem for DOCX downloads, e.g. "assessment-fba-record". */
  slug: string;
  values: FormValues;
  onChange: (values: FormValues) => void;
  visibilityRules: VisibilityRule[];
  alwaysRequiredFieldIds: string[];
  quotedValues: Record<string, unknown>;
  missingFields: string[];
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  /** Rendered above the registry-driven form (bundle panels, gates). */
  beforeForm?: ReactNode;
  /** Rendered below it, above the submit button (approval, release). */
  afterForm?: ReactNode;
  /** When set, the submit button is disabled and the reason is shown. */
  submitDisabledReason?: string;
}

/**
 * Every document 04-09 renders through this: the same DOCX/print
 * controls, the same validation alert, the same registry-driven
 * FormRenderer. Per-document behaviour arrives as `beforeForm`/
 * `afterForm`, never as a second renderer.
 */
export function DocumentShell({
  documentId,
  slug,
  values,
  onChange,
  visibilityRules,
  alwaysRequiredFieldIds,
  quotedValues,
  missingFields,
  onSubmit,
  submitLabel,
  beforeForm,
  afterForm,
  submitDisabledReason,
}: DocumentShellProps) {
  const doc = documentDef(documentId);
  const fields = documentFields(documentId);
  const quoted = quotedFields(documentId);

  function handleDownloadBlank() {
    renderBlankDocxBlob(doc, documentId, fields, FRACTA_FLOW_BRAND, quoted).then((blob) =>
      download(blob, `fracta-flow-${slug}-blank.docx`),
    );
  }

  function handleDownloadCompleted() {
    renderCompletedDocxBlob(
      doc,
      documentId,
      fields,
      FRACTA_FLOW_BRAND,
      flattenValuesForExport(values),
      quoted,
      quotedValues,
    ).then((blob) => download(blob, `fracta-flow-${slug}-completed.docx`));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="no-print" style={{ marginBottom: "1.5rem" }}>
        <button type="button" onClick={handleDownloadBlank}>
          Download blank DOCX
        </button>{" "}
        <button type="button" onClick={handleDownloadCompleted}>
          Download completed DOCX
        </button>{" "}
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {beforeForm}

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={doc}
        fields={fields}
        values={values}
        onChange={onChange}
        visibilityRules={visibilityRules}
        alwaysRequiredFieldIds={alwaysRequiredFieldIds}
        newRowId={newRowId}
        quotedFields={quoted}
        quotedValues={quotedValues}
      />

      {afterForm}

      <button type="submit" className="primary no-print" disabled={Boolean(submitDisabledReason)}>
        {submitLabel}
      </button>
      {submitDisabledReason && <p className="field-note no-print">{submitDisabledReason}</p>}
    </form>
  );
}

import type { DocumentDef, FieldDef } from "@pbs/registry";
import { useState } from "react";
import { formatReadOnlyValue } from "./fields/Field.js";
import { FormRenderer, type FormValues } from "./FormRenderer.js";
import { isFieldVisible, requiredFieldIds, type VisibilityRule } from "./visibility.js";

export interface FormWizardProps {
  document: DocumentDef;
  fields: FieldDef[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  visibilityRules: VisibilityRule[];
  alwaysRequiredFieldIds: string[];
  newRowId: () => string;
  quotedFields?: FieldDef[];
  quotedValues?: Record<string, unknown>;
  /** Rendered above the wizard on every step (export controls, alerts). */
  header?: React.ReactNode;
  /** e.g. "DOCUMENT 01 · FREE" — prefixed to the current section id in the
   * small accent-coloured eyebrow line above each step. */
  documentEyebrow: string;
  /** Called once the practitioner confirms the review step. */
  onComplete: () => void;
  completeLabel: string;
}

/**
 * Steps a document's own sections one at a time — Next/Back, a review step
 * listing every answered field with a "Change" link back to its owning
 * step, then hands off to `onComplete`. Reuses FormRenderer unchanged by
 * scoping `document.sections` to the current step; no per-field markup or
 * duplicated field dispatch lives here.
 */
export function FormWizard({
  document,
  fields,
  values,
  onChange,
  visibilityRules,
  alwaysRequiredFieldIds,
  newRowId,
  quotedFields = [],
  quotedValues = {},
  header,
  documentEyebrow,
  onComplete,
  completeLabel,
}: FormWizardProps) {
  const steps = document.sections.filter(
    (section) =>
      fields.some((f) => f.askedIn === section.id) || quotedFields.some((f) => f.rendersIn.includes(section.id)),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = requiredFieldIds(visibilityRules, values.scalar, alwaysRequiredFieldIds);
  const maybeCurrentSection = steps[stepIndex];
  if (!maybeCurrentSection) return null;
  const currentSection = maybeCurrentSection;

  function fieldsMissingIn(sectionId: string): string[] {
    return fields
      .filter((f) => f.askedIn === sectionId && required.has(f.id) && isFieldVisible(f.id, visibilityRules, values.scalar))
      .filter((f) => {
        const v = values.scalar[f.id];
        return v === undefined || v === null || v === "";
      })
      .map((f) => f.label);
  }

  function goToStep(index: number) {
    setStepIndex(index);
    setPhase("form");
    setMissingFields([]);
  }

  function handleNext() {
    const missing = fieldsMissingIn(currentSection.id);
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    setMissingFields([]);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setPhase("review");
    }
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  if (phase === "review") {
    return (
      <div>
        {header}
        <h2 style={{ fontSize: "1.1rem" }}>Review your answers</h2>
        <p>Check each answer before finishing. Use "Change" to jump back and edit a step.</p>
        {steps.map((section, index) => {
          const sectionFields = fields.filter(
            (f) => f.askedIn === section.id && isFieldVisible(f.id, visibilityRules, values.scalar),
          );
          if (sectionFields.length === 0) return null;
          return (
            <section key={section.id} className="card" style={{ padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
                  {section.id} {section.title}
                </h3>
                <button type="button" onClick={() => goToStep(index)}>
                  Change
                </button>
              </div>
              {sectionFields.map((field) => (
                <p key={field.id} style={{ margin: "0.25rem 0" }}>
                  <strong>{field.label}: </strong>
                  {formatReadOnlyValue(field, values.scalar[field.id])}
                </p>
              ))}
            </section>
          );
        })}
        <button type="button" className="primary no-print" onClick={onComplete}>
          {completeLabel}
        </button>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="wizard-eyebrow-row">
        <div className="wizard-eyebrow">
          {documentEyebrow} · {currentSection.id}
        </div>
        <div className="wizard-step-label">
          Step {stepIndex + 1} of {steps.length}
        </div>
      </div>
      <p aria-hidden="true" style={{ display: "flex", gap: "4px", margin: "0 0 1.5rem" }}>
        {steps.map((section, index) => (
          <span
            key={section.id}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background:
                index < stepIndex
                  ? "var(--purple)"
                  : index === stepIndex
                    ? "color-mix(in srgb, var(--purple) 25%, white)"
                    : "var(--border-hairline)",
            }}
          />
        ))}
      </p>

      {missingFields.length > 0 && (
        <div role="alert" style={{ border: "2px solid #111", padding: "0.75rem", marginBottom: "1rem" }}>
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={{ ...document, sections: [currentSection] }}
        fields={fields}
        values={values}
        onChange={onChange}
        visibilityRules={visibilityRules}
        alwaysRequiredFieldIds={alwaysRequiredFieldIds}
        newRowId={newRowId}
        quotedFields={quotedFields}
        quotedValues={quotedValues}
      />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button type="button" onClick={handleBack} disabled={stepIndex === 0}>
          Back
        </button>
        <button type="button" className="primary" onClick={handleNext}>
          {stepIndex < steps.length - 1 ? "Next" : "Review"}
        </button>
      </div>
    </div>
  );
}

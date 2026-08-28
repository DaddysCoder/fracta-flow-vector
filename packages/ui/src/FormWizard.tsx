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
  /** Optional actions shown on the review screen, not above every form step. */
  header?: React.ReactNode;
  documentEyebrow: string;
  onComplete: () => void;
  completeLabel: string;
}

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
      <div className="vector-form-wizard">
        <h1 className="vector-review-title">Check this over</h1>
        <p className="vector-review-intro">Review your answers before finishing. Use Change to edit a section.</p>

        <div className="vector-review-list">
          {steps.map((section, index) => {
            const sectionFields = fields.filter(
              (f) => f.askedIn === section.id && isFieldVisible(f.id, visibilityRules, values.scalar),
            );
            if (sectionFields.length === 0) return null;
            return (
              <section key={section.id} className="vector-review-section">
                <div className="vector-review-section-header">
                  <h2 className="vector-review-section-title">{section.title}</h2>
                  <button type="button" className="vector-review-change" onClick={() => goToStep(index)}>
                    Change
                  </button>
                </div>
                {sectionFields.map((field) => (
                  <div key={field.id} className="vector-review-row">
                    <span className="vector-review-label">{field.label}</span>
                    <span className="vector-review-value">
                      {formatReadOnlyValue(field, values.scalar[field.id])}
                    </span>
                  </div>
                ))}
              </section>
            );
          })}
        </div>

        {header}

        <div className="wizard-actions no-print">
          <button type="button" className="wizard-back" onClick={() => goToStep(steps.length - 1)}>
            Back
          </button>
          <button type="button" className="primary wizard-next" onClick={onComplete}>
            {completeLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vector-form-wizard">
      <div className="wizard-eyebrow-row">
        <div className="wizard-eyebrow">
          {documentEyebrow} · {currentSection.id}
        </div>
        <div className="wizard-step-label">
          Step {stepIndex + 1} of {steps.length}
        </div>
      </div>

      <div className="vector-progress" aria-hidden="true">
        {steps.map((section, index) => (
          <span
            key={section.id}
            className={`vector-progress-segment${index < stepIndex ? " is-complete" : ""}${
              index === stepIndex ? " is-current" : ""
            }`}
          />
        ))}
      </div>

      {missingFields.length > 0 && (
        <div role="alert" className="vector-validation-alert">
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

      <div className="wizard-actions no-print">
        {stepIndex > 0 ? (
          <button type="button" className="wizard-back" onClick={handleBack}>
            Back
          </button>
        ) : null}
        <button type="button" className="primary wizard-next" onClick={handleNext}>
          {stepIndex < steps.length - 1 ? "Next" : "Review"}
        </button>
      </div>
    </div>
  );
}

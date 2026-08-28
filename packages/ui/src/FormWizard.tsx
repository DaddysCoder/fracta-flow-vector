import type { DocumentDef, FieldDef } from "@pbs/registry";
import { useMemo, useState } from "react";
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
  header?: React.ReactNode;
  documentEyebrow: string;
  onComplete: () => void;
  completeLabel: string;
}

const MAX_FIELDS_PER_STEP = 4;

interface WizardStep {
  key: string;
  section: DocumentDef["sections"][number];
  fields: FieldDef[];
  quotedFields: FieldDef[];
}

function buildSteps(document: DocumentDef, fields: FieldDef[], quotedFields: FieldDef[]): WizardStep[] {
  const steps: WizardStep[] = [];

  for (const section of document.sections) {
    const sectionFields = fields.filter((field) => field.askedIn === section.id);
    const sectionQuoted = quotedFields.filter((field) => field.rendersIn.includes(section.id));
    if (sectionFields.length === 0 && sectionQuoted.length === 0) continue;

    // Keep repeatable groups together, but split ordinary fields into short,
    // comfortable screens. The approved Vector prototype is deliberately a
    // "few questions, then Next" flow rather than one registry section per
    // long page.
    const units: FieldDef[][] = [];
    const handledGroups = new Set<string>();
    for (const field of sectionFields) {
      if (!field.group) {
        units.push([field]);
        continue;
      }
      if (handledGroups.has(field.group)) continue;
      handledGroups.add(field.group);
      units.push(sectionFields.filter((candidate) => candidate.group === field.group));
    }

    let chunk: FieldDef[] = [];
    let part = 1;
    function flush() {
      if (chunk.length === 0 && !(part === 1 && sectionQuoted.length > 0)) return;
      steps.push({
        key: `${section.id}-${part}`,
        section,
        fields: chunk,
        quotedFields: part === 1 ? sectionQuoted : [],
      });
      chunk = [];
      part += 1;
    }

    for (const unit of units) {
      if (chunk.length > 0 && chunk.length + unit.length > MAX_FIELDS_PER_STEP) flush();
      chunk.push(...unit);
      if (chunk.length >= MAX_FIELDS_PER_STEP) flush();
    }
    flush();
  }

  return steps;
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
  const steps = useMemo(() => buildSteps(document, fields, quotedFields), [document, fields, quotedFields]);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const required = requiredFieldIds(visibilityRules, values.scalar, alwaysRequiredFieldIds);
  const maybeCurrentStep = steps[stepIndex];
  if (!maybeCurrentStep) return null;
  const currentStep = maybeCurrentStep;

  function fieldsMissingInStep(step: WizardStep): string[] {
    return step.fields
      .filter((field) => required.has(field.id) && isFieldVisible(field.id, visibilityRules, values.scalar))
      .filter((field) => {
        const value = values.scalar[field.id];
        return value === undefined || value === null || value === "";
      })
      .map((field) => field.label);
  }

  function goToStep(index: number) {
    setStepIndex(index);
    setPhase("form");
    setMissingFields([]);
  }

  function handleNext() {
    const missing = fieldsMissingInStep(currentStep);
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    setMissingFields([]);
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else setPhase("review");
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
          {document.sections.map((section) => {
            const sectionFields = fields.filter(
              (field) => field.askedIn === section.id && isFieldVisible(field.id, visibilityRules, values.scalar),
            );
            if (sectionFields.length === 0) return null;
            const firstStepIndex = Math.max(0, steps.findIndex((step) => step.section.id === section.id));
            return (
              <section key={section.id} className="vector-review-section">
                <div className="vector-review-section-header">
                  <h2 className="vector-review-section-title">{section.title}</h2>
                  <button type="button" className="vector-review-change" onClick={() => goToStep(firstStepIndex)}>
                    Change
                  </button>
                </div>
                {sectionFields.map((field) => (
                  <div key={field.id} className="vector-review-row">
                    <span className="vector-review-label">{field.label}</span>
                    <span className="vector-review-value">{formatReadOnlyValue(field, values.scalar[field.id])}</span>
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
        <div className="wizard-eyebrow">{documentEyebrow} · {currentStep.section.id}</div>
        <div className="wizard-step-label">Step {stepIndex + 1} of {steps.length}</div>
      </div>

      <div className="vector-progress" aria-hidden="true">
        {steps.map((step, index) => (
          <span
            key={step.key}
            className={`vector-progress-segment${index < stepIndex ? " is-complete" : ""}${index === stepIndex ? " is-current" : ""}`}
          />
        ))}
      </div>

      {missingFields.length > 0 && (
        <div role="alert" className="vector-validation-alert">
          Please complete: {missingFields.join(", ")}
        </div>
      )}

      <FormRenderer
        document={{ ...document, sections: [currentStep.section] }}
        fields={currentStep.fields}
        values={values}
        onChange={onChange}
        visibilityRules={visibilityRules}
        alwaysRequiredFieldIds={alwaysRequiredFieldIds}
        newRowId={newRowId}
        quotedFields={currentStep.quotedFields}
        quotedValues={quotedValues}
      />

      <div className="wizard-actions no-print">
        {stepIndex > 0 ? (
          <button type="button" className="wizard-back" onClick={handleBack}>Back</button>
        ) : null}
        <button type="button" className="primary wizard-next" onClick={handleNext}>
          {stepIndex < steps.length - 1 ? "Next" : "Review"}
        </button>
      </div>
    </div>
  );
}

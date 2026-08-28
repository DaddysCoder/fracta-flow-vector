import type { DocumentDef, FieldDef } from "@pbs/registry";
import { Field, ReadOnlyField } from "./fields/Field.js";
import { RepeatableGroup, type RepeatableRow } from "./fields/RepeatableGroup.js";
import {
  isFieldVisible,
  isGroupVisible,
  requiredFieldIds as computeRequired,
  type VisibilityRule,
} from "./visibility.js";

export interface FormValues {
  scalar: Record<string, unknown>;
  groups: Record<string, RepeatableRow[]>;
}

/**
 * Flattens form values into the shape @pbs/export's docx renderer takes:
 * scalar fields keyed by id, repeatable fields keyed by id to an array of
 * one value per row (row order, empty values dropped). Row ids are not
 * carried — the docx layout is organized by field, never by row, so
 * nothing downstream needs them.
 */
export function flattenValuesForExport(values: FormValues): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...values.scalar };
  for (const rows of Object.values(values.groups)) {
    for (const row of rows) {
      for (const [fieldId, value] of Object.entries(row.values)) {
        if (value === undefined || value === null || value === "") continue;
        const bucket = (flat[fieldId] as unknown[] | undefined) ?? [];
        bucket.push(value);
        flat[fieldId] = bucket;
      }
    }
  }
  return flat;
}

export interface FormRendererProps {
  document: DocumentDef;
  /** Fields askedIn one of this document's own sections. */
  fields: FieldDef[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  visibilityRules: VisibilityRule[];
  alwaysRequiredFieldIds: string[];
  newRowId: () => string;
  /** Fields quoted into this document from elsewhere (registry `rendersIn`
   * only — not `askedIn` here). Rendered read-only from `quotedValues`,
   * never as an input. */
  quotedFields?: FieldDef[];
  /** Resolved values for `quotedFields`, keyed by field id. A field with
   * no entry renders as "Not yet available", never blank. */
  quotedValues?: Record<string, unknown>;
}

/**
 * Renders a document straight from its registry definition: fixed
 * section order, no per-participant reordering, one dispatch table for
 * field types. Adding a field to fields.json is enough to make it
 * appear here — there is no per-form component to write.
 */
export function FormRenderer({
  document,
  fields,
  values,
  onChange,
  visibilityRules,
  alwaysRequiredFieldIds,
  newRowId,
  quotedFields = [],
  quotedValues = {},
}: FormRendererProps) {
  const required = computeRequired(visibilityRules, values.scalar, alwaysRequiredFieldIds);

  return (
    <>
      {document.sections.map((section) => {
        const sectionFields = fields.filter((f) => f.askedIn === section.id);
        const sectionQuoted = quotedFields.filter((f) => f.rendersIn.includes(section.id));
        if (sectionFields.length === 0 && sectionQuoted.length === 0) return null;

        const groupNames = [...new Set(sectionFields.filter((f) => f.group).map((f) => f.group!))].filter(
          (groupName) =>
            isGroupVisible(
              sectionFields.filter((f) => f.group === groupName).map((f) => f.id),
              visibilityRules,
              values.scalar,
            ),
        );
        const ungrouped = sectionFields.filter((f) => !f.group);

        return (
          <section className="form-section" key={section.id} aria-labelledby={`section-${section.id}`}>
            <h2 className="section-title" id={`section-${section.id}`}>
              {section.id} {section.title}
            </h2>

            {sectionQuoted.map((field) => (
              <ReadOnlyField key={field.id} field={field} value={quotedValues[field.id]} />
            ))}

            {ungrouped
              .filter((field) => isFieldVisible(field.id, visibilityRules, values.scalar))
              .map((field) => (
                <Field
                  key={field.id}
                  field={field}
                  value={values.scalar[field.id]}
                  required={required.has(field.id)}
                  onChange={(value) =>
                    onChange({ ...values, scalar: { ...values.scalar, [field.id]: value } })
                  }
                />
              ))}

            {groupNames.map((groupName) => (
              <RepeatableGroup
                key={groupName}
                groupLabel={groupName.replace(/_/g, " ")}
                fields={sectionFields.filter(
                  (f) => f.group === groupName && isFieldVisible(f.id, visibilityRules, values.scalar),
                )}
                rows={values.groups[groupName] ?? []}
                requiredFieldIds={required}
                newRowId={newRowId}
                onChange={(rows) =>
                  onChange({ ...values, groups: { ...values.groups, [groupName]: rows } })
                }
              />
            ))}
          </section>
        );
      })}
    </>
  );
}

/**
 * Single-page, card-per-section variant of FormRenderer — for documents
 * the design handoff shows as one scrolling page of `.card` sections
 * (Source Register, RRP Assessment, Support Letter, Progress Report),
 * never a wizard. Reuses FormRenderer scoped to one section at a time
 * (the same "narrow `document.sections`" trick FormWizard uses for its
 * steps), so section-dispatch/visibility logic isn't duplicated — only
 * the `.card` wrapper per section is added here.
 */
export function CardSectionsForm(props: FormRendererProps) {
  const { document, fields, quotedFields = [] } = props;
  return (
    <>
      {document.sections.map((section) => {
        const hasFields = fields.some((f) => f.askedIn === section.id);
        const hasQuoted = quotedFields.some((f) => f.rendersIn.includes(section.id));
        if (!hasFields && !hasQuoted) return null;
        return (
          <div className="card" key={section.id} style={{ marginBottom: "1.25rem" }}>
            <FormRenderer {...props} document={{ ...document, sections: [section] }} />
          </div>
        );
      })}
    </>
  );
}
